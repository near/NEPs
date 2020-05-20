# Messages

All message sent in the network are of type `PeerMessage`. They are encoded using [Borsh](https://borsh.io/) which allows a rich structure, small size and fast encoding/decoding. For deatils about data structure used as part of the message see the [reference code](https://github.com/nearprotocol/nearcore).

Check [Borsh specification](https://github.com/nearprotocol/borsh#specification) details to see how it handles `enum`, `struct` and basic data types.

## PeerMessage

```rust
enum PeerMessage {
    Handshake(Handshake),
    HandshakeFailure(PeerInfo, HandshakeFailureReason),
    /// When a failed nonce is used by some peer, this message is sent back as evidence.
    LastEdge(Edge),
    /// Contains accounts and edge information.
    Sync(SyncData),
    RequestUpdateNonce(EdgeInfo),
    ResponseUpdateNonce(Edge),
    PeersRequest,
    PeersResponse(Vec<PeerInfo>),
    BlockHeadersRequest(Vec<CryptoHash>),
    BlockHeaders(Vec<BlockHeader>),
    BlockRequest(CryptoHash),
    Block(Block),
    Transaction(SignedTransaction),
    Routed(RoutedMessage),
    /// Gracefully disconnect from other peer.
    Disconnect,
    Challenge(Challenge),
}
```

## Handshake

```rust
struct Handshake {
    /// Protocol version.
    version: u32,
    /// Sender's peer id.
    peer_id: PeerId,
    /// Receiver's peer id.
    target_peer_id: PeerId,
    /// Sender's listening addr.
    listen_port: Option<u16>,
    /// Peer's chain information.
    chain_info: PeerChainInfo,
    /// Info for new edge.
    edge_info: EdgeInfo,
}
```

## Edge

```rust
struct Edge {
    /// Since edges are not directed `peer0 < peer1` should hold.
    peer0: PeerId,
    peer1: PeerId,
    /// Nonce to keep tracking of the last update on this edge.
    nonce: u64,
    /// Signature from parties validating the edge. These are signature of the added edge.
    signature0: Signature,
    signature1: Signature,
    /// Info necessary to declare an edge as removed.
    /// The bool says which party is removing the edge: false for Peer0, true for Peer1
    /// The signature from the party removing the edge.
    removal_info: Option<(bool, Signature)>,
}
```

## EdgeInfo

```rust
struct EdgeInfo {
    nonce: u64,
    signature: Signature,
}
```

## RoutedMessage

```rust
struct RoutedMessage {
    /// Peer id which is directed this message.
    /// If `target` is hash, this a message should be routed back.
    target: PeerIdOrHash,
    /// Original sender of this message
    author: PeerId,
    /// Signature from the author of the message. If this signature is invalid we should ban
    /// last sender of this message. If the message is invalid we should ben author of the message.
    signature: Signature,
    /// Time to live for this message. After passing through some hop this number should be
    /// decreased by 1. If this number is 0, drop this message.
    ttl: u8,
    /// Message
    body: RoutedMessageBody,
}
```