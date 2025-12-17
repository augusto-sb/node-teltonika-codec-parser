import { deepStrictEqual } from 'node:assert';

import { Codec, Parser, Protocol, Result } from '../src';

const tests: {
	codec: Codec,
	over: Protocol,
	mainPkg: string, // hexa string packet like in page
	expected: Result,
}[] = [
	{
		codec: Codec.C8,
		over: Protocol.TCP,
		mainPkg: '000000000000003608010000016B40D8EA30010000000000000000000000000000000105021503010101425E0F01F10000601A014E0000000000000000010000C7CF',
		expected: {
			avl: [{
				altitude: 0,
				angle: 0,
				eventIoId: 1,
				io: {
					'1': 1,
					'21': 3,
					'241': 24602,
					'66': 24079,
					'78': 0,
				},
				latitude: 0,
				longitude: 0,
				priority: 1,
				satellites: 0,
				speed: 0,
				timestamp: 1560161086000
			}],
		},
	},
	{
		codec: Codec.C8,
		over: Protocol.TCP,
		mainPkg: '000000000000002808010000016B40D9AD80010000000000000000000000000000000103021503010101425E100000010000F22A',
		expected: {
			avl: [{
				altitude: 0,
				angle: 0,
				eventIoId: 1,
				io: {
					'1': 1,
					'21': 3,
					'66': 24080
				},
				latitude: 0,
				longitude: 0,
				priority: 1,
				satellites: 0,
				speed: 0,
				timestamp: 1560161136000,
			}],
		},
	},
	{
		codec: Codec.C8,
		over: Protocol.TCP,
		mainPkg: '000000000000004308020000016B40D57B480100000000000000000000000000000001010101000000000000016B40D5C198010000000000000000000000000000000101010101000000020000252C',
		expected: {
			avl: [{
				altitude: 0,
				angle: 0,
				eventIoId: 1,
				io: {
					'1': 0
				},
				latitude: 0,
				longitude: 0,
				priority: 1,
				satellites: 0,
				speed: 0,
				timestamp: 1560160861000,
			},
			{
				altitude: 0,
				angle: 0,
				eventIoId: 1,
				io: {
					'1': 1
				},
				latitude: 0,
				longitude: 0,
				priority: 1,
				satellites: 0,
				speed: 0,
				timestamp: 1560160879000
			}],
		},
	},
	{
		codec: Codec.C8,
		over: Protocol.UDP,
		mainPkg: '003DCAFE0105000F33353230393330383634303336353508010000016B4F815B30010000000000000000000000000000000103021503010101425DBC000001',
		expected: {
			avl: [
				{
					altitude: 0,
					angle: 0,
					eventIoId: 1,
					io: {
						'1': 1,
						'21': 3,
						'66': 23996
					},
					latitude: 0,
					longitude: 0,
					priority: 1,
					satellites: 0,
					speed: 0,
					timestamp: 1560407006000
				}
			],
			udpOnly: {
				avlPacketId: 5,
				imei: '333532303933303836343033363535',
				packetId: 51966,
				packetLength: 61,
			},
		},
	},
	{
		codec: Codec.C8E,
		over: Protocol.TCP,
		mainPkg: '000000000000004A8E010000016B412CEE000100000000000000000000000000000000010005000100010100010011001D00010010015E2C880002000B000000003544C87A000E000000001DD7E06A00000100002994',
		expected: {
			avl: [
				{
					altitude: 0,
					angle: 0,
					eventIoId: 1,
					io: {
						'1': 1,
						'11': 893700218,
						'14': 500686954,
						'16': 22949000,
						'17': 29
					},
					latitude: 0,
					longitude: 0,
					priority: 1,
					satellites: 0,
					speed: 0,
					timestamp: 1560166592000
				},
			],
		},
	},
	{
		codec: Codec.C8E,
		over: Protocol.UDP,
		mainPkg: '005FCAFE0107000F3335323039333038363430333635358E010000016B4F831C680100000000000000000000000000000000010005000100010100010011009D00010010015E2C880002000B000000003544C87A000E000000001DD7E06A000001',
		expected: {
			avl: [
				{
					altitude: 0,
					angle: 0,
					eventIoId: 1,
					io: {
						'1': 1,
						'11': 893700218,
						'14': 500686954,
						'16': 22949000,
						'17': 157
					},
					latitude: 0,
					longitude: 0,
					priority: 1,
					satellites: 0,
					speed: 0,
					timestamp: 1560407121000
				}
			],
			udpOnly: {
				avlPacketId: 7,
				imei: '333532303933303836343033363535',
				packetId: 51966,
				packetLength: 95
			}
		},
	},
	{
		codec: Codec.C16,
		over: Protocol.TCP,
		mainPkg: '000000000000005F10020000016BDBC7833000000000000000000000000000000000000B05040200010000030002000B00270042563A00000000016BDBC7871800000000000000000000000000000000000B05040200010000030002000B00260042563A00000200005FB3',
		expected: {
			avl: [
				{
					altitude: 0,
					angle: 0,
					eventIoId: 11,
					generationType: 5,
					io: {
						'1': 0,
						'11': 39,
						'3': 0,
						'66': 22074
					},
					latitude: 0,
					longitude: 0,
					priority: 0,
					satellites: 0,
					speed: 0,
					timestamp: 1562760414000
				},
				{
					altitude: 0,
					angle: 0,
					eventIoId: 11,
					generationType: 5,
					io: {
						'1': 0,
						'11': 38,
						'3': 0,
						'66': 22074
					},
					latitude: 0,
					longitude: 0,
					priority: 0,
					satellites: 0,
					speed: 0,
					timestamp: 1562760415000
				}
			],
		},
	},
	{
		codec: Codec.C16,
		over: Protocol.UDP,
		mainPkg: '0048CAFE0101000F33353230393430383532333135393210010000015117E40FE80000000000000000000000000000000000EF05050400010000030000B40000EF01010042111A000001',
		expected: {
			avl: [
			{
				altitude: 0,
				angle: 0,
				eventIoId: 239,
				generationType: 5,
				io: {
					'1': 0,
					'180': 0,
					'239': 1,
					'3': 0,
					'66': 4378
				},
				latitude: 0,
				longitude: 0,
				priority: 0,
				satellites: 0,
				speed: 0,
				timestamp: 1447804801000
				}
			],
			udpOnly: {
				avlPacketId: 1,
				imei: '333532303934303835323331353932',
				packetId: 51966,
				packetLength: 72
			}
		},
	},
];

for(const test of tests){
	const res = Parser(test.codec, test.over, Buffer.from(test.mainPkg, 'hex'))
	deepStrictEqual(res, test.expected);
}