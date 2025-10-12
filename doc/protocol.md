Ctrl + Shift + P

@startuml
title 0-RTT in QUIC Protocol

actor Client
actor Server

' This diagram represents the initial communication between the Client and Server.
' The Client sends an Initial Packet containing the ClientHello message.
' The ClientHello message includes data such as the client's supported cryptographic algorithms,
' session resumption information, and other parameters necessary to establish a secure connection.
Client -> Server: Initial Packet (ClientHello)
Client -> Server: 0-RTT Data
Server -> Client: Initial Packet (ServerHello)
Server -> Client: Encrypted Extensions
Server -> Client: Finished
Client -> Server: Finished
Client -> Server: 1-RTT Data
Server -> Client: 1-RTT Data

@enduml