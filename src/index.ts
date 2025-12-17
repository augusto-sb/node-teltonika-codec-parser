import { Buffer } from 'node:buffer';

export enum Protocol {
  UDP = 'UDP',
  TCP = 'TCP',
}

export enum Codec {
  C8 = '8',
  C8E = '8E',
  C16 = '16',
}

type UdpOnly = {
  packetId: number;
  avlPacketId: number;
  imei: string;
  packetLength: number;
};

type AvlData = {
  timestamp: number;
  priority: number;
  longitude: number;
  latitude: number;
  altitude: number;
  angle: number;
  satellites: number;
  speed: number;
  eventIoId: number;
  io: Record<string, number>;
  generationType?: number;
};

export type Result = {
  avl: AvlData[];
  udpOnly?: UdpOnly;
};

function SliceToHex(input: Buffer): string {
  return input
    .map(
      (x) => (String(Math.floor(x / 16)) + String(x % 16)) as unknown as number,
    )
    .join('');
}

function AnyBytesToNumber(input: Buffer): number {
  let res = 0n;
  for (let i = 0; i < input.length; i++) {
    res = res << 8n;
    res += BigInt(input[i]);
  }
  return Number(res);
}

function CRC16IBM(input: Buffer): number {
  let crc = 0;
  for (let byteNumber = 0; byteNumber < input.length; byteNumber++) {
    crc = crc ^ input[byteNumber];
    for (let bitNumber = 0; bitNumber < 8; bitNumber++) {
      const carry = crc & 1;
      crc = crc >> 1;
      if (carry === 1) {
        crc = crc ^ 0xa001;
      }
    }
  }
  return crc;
}

function int32TwosComplement(input: number){
  return input & 0x80000000 ? -(~input+1) : input;
}

export function Parser(codec: Codec, over: Protocol, buffer: Buffer): Result {
  let udpOnly: UdpOnly | undefined = undefined;
  if (!Object.values(Codec).includes(codec)) {
    throw new Error('invalid Codec parameter value');
  }
  if (!Object.values(Protocol).includes(over)) {
    throw new Error('invalid Protocol parameter value');
  }

  if (buffer.length < (over === Protocol.TCP ? 8 : 2)) {
    throw new Error('cant check length');
  }

  const length = AnyBytesToNumber(
    over === Protocol.TCP ? buffer.slice(4, 8) : buffer.slice(0, 2),
  );
  if (length + (over === Protocol.TCP ? 12 : 2) !== buffer.length) {
    throw new Error('length err');
  }

  let codecIdtoNumberOfData2: null | Buffer = null;

  // especificos
  if (over === Protocol.TCP) {
    if (
      buffer[0] !== 0 ||
      buffer[1] !== 0 ||
      buffer[2] !== 0 ||
      buffer[3] !== 0
    ) {
      throw new Error('preamble error');
    }
    codecIdtoNumberOfData2 = buffer.slice(8, buffer.length - 4);
    const crc = AnyBytesToNumber(buffer.slice(buffer.length - 4));
    if (crc !== CRC16IBM(codecIdtoNumberOfData2)) {
      throw new Error('crc error!');
    }
  } else {
    const packetId = (buffer[2] << 8) + buffer[3];
    if (buffer[4] !== 1) {
      throw new Error('not usable byte err');
    }
    const avlPacketId = buffer[5];
    const imeiLength = (buffer[6] << 8) + buffer[7];
    if (imeiLength !== 15) {
      throw new Error('imeiLength err');
    }
    const imei = SliceToHex(buffer.slice(8, 8 + imeiLength));
    codecIdtoNumberOfData2 = buffer.slice(8 + imeiLength);
    udpOnly = {
      packetId,
      avlPacketId,
      imei,
      packetLength: length,
    };
  }

  if (
    (codecIdtoNumberOfData2[0] === 8 /* 0x8 */ && codec !== Codec.C8) ||
    (codecIdtoNumberOfData2[0] === 16 /* 0x10 */ && codec !== Codec.C16) ||
    (codecIdtoNumberOfData2[0] === 142 /* 0x8e */ && codec !== Codec.C8E) ||
    ![8, 16, 142].includes(codecIdtoNumberOfData2[0])
  ) {
    throw new Error('error with codecid, invalid or different from declared');
  }

  const numberOfData1 = codecIdtoNumberOfData2[1];
  const numberOfData2 =
    codecIdtoNumberOfData2[codecIdtoNumberOfData2.length - 1];
  if (numberOfData1 !== numberOfData2) {
    throw new Error('inconsistent numberOfData');
  }

  const avlBytes = codecIdtoNumberOfData2.slice(
    2,
    codecIdtoNumberOfData2.length - 1,
  );
  const avl: AvlData[] = [];

  const avlRecordSize = avlBytes.length / numberOfData1;
  for (let r = 0; r < numberOfData1; r++) {
    const avlRecordBytes = avlBytes.slice(
      r * avlRecordSize,
      avlRecordSize * (r + 1),
    );
    const timestamp = AnyBytesToNumber(avlRecordBytes.slice(0, 8));
/*
Priority
0   Low
1   High
2   Panic
*/
    const priority = avlRecordBytes[8];
    if(priority > 2){
      console.warn('invalid Priority');
    }
    /*
Longitude – east-west position.
Latitude – north-south position.
Altitude – meters above sea level.
Angle – degrees from north pole.
Satellites – number of satellites in use.
Speed – speed calculated from satellites.
    */
    const longitude = int32TwosComplement(AnyBytesToNumber(avlRecordBytes.slice(9, 13))) / 7;
    const latitude = int32TwosComplement(AnyBytesToNumber(avlRecordBytes.slice(13, 17))) / 7;
/*
longitude and latitude: 7 0's precision = p * (d + m/60 + s/3600 + ms/3600000)
2s complement
*/
    const altitude = AnyBytesToNumber(avlRecordBytes.slice(17, 19));
    const angle = AnyBytesToNumber(avlRecordBytes.slice(19, 21));
    const satellites = avlRecordBytes[21]; // km/h ???
    const speed = AnyBytesToNumber(avlRecordBytes.slice(22, 24));
    if(speed === 0){
      // Note: Speed will be 0x0000 if GPS data is invalid
      console.warn('gps data is invalid');
    }
    const eventIoId =
      codec === Codec.C8
        ? avlRecordBytes[24]
        : AnyBytesToNumber(avlRecordBytes.slice(24, 26));
    let j = codec === Codec.C8 ? 25 : 26;
/*
Generation type

Value   Record Created
0   On Exit
1   On Entrance
2   On Both
3   Reserved
4   Hysteresis
5   On Change
6   Eventual
7   Periodical
*/
    let generationType: undefined | number = undefined;
    if (codec === Codec.C16) {
      generationType = avlRecordBytes[j];
      j++;
      if(generationType > 7){
        console.warn('invalid Generation Type')
      }
    }
    const io: Record<string, number> = {};
    const widthCount = codec === Codec.C8E ? 2 : 1;
    const widthId = codec === Codec.C8 ? 1 : 2;
    const NOfTotalId = AnyBytesToNumber(
      avlRecordBytes.slice(j, j + widthCount),
    );
    j += widthCount;
    for (const length of [1, 2, 4, 8]) {
      let records = AnyBytesToNumber(avlRecordBytes.slice(j, j + widthCount));
      j += widthCount;
      while (records) {
        const id = String(
          AnyBytesToNumber(avlRecordBytes.slice(j, j + widthId)),
        );
        const val = AnyBytesToNumber(
          avlRecordBytes.slice(j + widthId, j + widthId + length),
        );
        io[id] = val;
        j += widthId + length;
        records--;
      }
    }
    if (codec === Codec.C8E) {
      //variable size
      let NX = (avlRecordBytes[j] << 8) + avlRecordBytes[j + 1];
      j += 2;
      while (NX) {
        // 2 de id, 2 de length, lengths de value
        const id = String((avlRecordBytes[j] << 8) + avlRecordBytes[j + 1]);
        const length = (avlRecordBytes[j + 2] << 8) + avlRecordBytes[j + 3];
        const val = AnyBytesToNumber(
          avlRecordBytes.slice(j + 4, j + 4 + length),
        );
        io[id] = val;
        j = j + 4 + length;
        NX--;
      }
    }
    if (NOfTotalId !== Object.keys(io).length) {
      throw new Error('NOfTotalId !== Object.keys(io).length !!!');
    }

    avl.push({
      timestamp,
      priority,
      longitude,
      latitude,
      altitude,
      angle,
      satellites,
      speed,
      eventIoId,
      io,
      ...(generationType ? { generationType } : {}),
    });
  }

  if (numberOfData1 !== avl.length) {
    throw new Error('numberOfData differs from avl.length');
  }

  return {
    avl,
    ...(udpOnly ? { udpOnly } : {}),
  };
}
