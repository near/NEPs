# 10. Message transportation layers.

This section describes different protocols of sending messages currently used in `Near`

## 10.1 Messages between Actors.

`Near` is build on `Actix`'s `actor` framework. (https://actix.rs/book/actix/sec-2-actor.html)
Usually each actor runs on its own dedicated thread.
Only messages implementing `actix::Message`, can be sent using between threads.

On example of such message is `PeersRequest` :
```
pub struct PeersRequest {}

impl actix::Message for PeersRequest {
    type Result = PeerRequestResult;
}

pub struct PeerRequestResult {
    pub peers: Vec<PeerInfo>,
}
```

## 10.2 Messages sent through TCP
Near using `borsh` serialization to exchange messages between nodes (See https://borsh.io/).
Only messages implementing `BorshSerialize`, `BorshDeserialize` can be sent.

Here is an example of on such message:
```rust
#[derive(BorshSerialize, BorshDeserialize)]
pub struct SyncData {
    pub(crate) edges: Vec<Edge>,
    pub(crate) accounts: Vec<AnnounceAccount>,
}
```

## 10.3 Messages sent/received through `chain/jsonrpc`
Near runs a json rest server. (See `actix_web::HttpServer`).
All messages sent and received must implement `serde::Serialize` and `serde::Deserialize`.

`StreamerMessage` is a good example:
```rust
#[derive(serde::Serialize, serde::Deserialize)]
pub struct StreamerMessage {
    pub block: views::BlockView,
    pub shards: Vec<IndexerShard>,
    pub state_changes: views::StateChangesView,
}
```
