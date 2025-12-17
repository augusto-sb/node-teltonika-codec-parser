# Info

This package exports a function for parsing Teltonika's Codec 8, Codec 8E and Codec 16 packets.

In their TCP and UDP variatios.

# Doc and Examples

https://wiki.teltonika-gps.com/view/Teltonika_Data_Sending_Protocols

# Tests

Tests included, based on the previous page examples (2 of which have been corrected, length, number of data, and io data errors)

# Example

- in the case of UDP, the device will send you a packet (that you can parse with the function) and you will have to send an ACK of 7 bytes e.g. 0x00000000000000, composition in the documentation.

- in the case of TCP, the device will send you the IMEI (i think it is always 17 bytes, 2 bytes indicating the length 0x0F and 15 bytes of the actual IMEI). you have to answer with 0x01, then the device will send you the parsable packet, finally you have to send the ACK (4 bytes with the number of avl records received, e.g. 0x00000001)

 
# Considerations

The function will throw an error with every inconsistency (length, number of records, preamble, codec id, malformed packets), except when gps data is invalid (speed = 0)