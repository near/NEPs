# 1. Overview
Near Protocol uses its own implementation of a custom peer-to-peer network
Peers who join network are represented by nodes and connected between them by edges.

The purpose of this document is to describe inner workings of `near-network` package;
and to be used as reference by future engineers to understand network code without any prior knowledge.

# 2. Code structure
`near-network` runs on top of `actor` framework called `Actix` (https://actix.rs/docs/).
Code structure is split between 4 actors `PeerManagerActor`, `PeerActor`, `RoutingTableActor`, `EdgeValidatorActor`

### 2.1 `EdgeValidatorActor` (currently called `EdgeVerifierActor` in the code (TODO rename))
`EdgeValidatorActor` runs on separate thread.
The purpose of this `actor` is to validate `edges`, where each `edge` represents a connection between two peers,
and it's signed with a cryptographic signature of both parties.
The process of edge validation involves verifying cryptographic signatures, which can be quite expensive,
and therefore was moved to another thread.

Responsibilities:
- validating edges by checking whenever cryptographic signatures match.

### 2.2 `RoutingTableActor`
`RoutingTableActor` maintain view of the `P2P network` represented by set of nodes and edges.

In case a message needs to be sent between two nodes, let's call them `A` and `B`.
If nodes `A` and `B` are connected then the message san be sent directly.
However, if there aren't a node `C` needs to be chosen to forward message from `A` to `B`.
This may be a direct or indirect route. `RoutingTableActor` is responsible for computing such set of nodes `C` that
meets the criteria.

Responsibilities:
- keep set of all edges of `P2P network` called routing table
- connects to `EdgeValidatorActor`, and asks for edges to be validated, when needed
- has logic related to exchanging edges between peers

### 2.3 `PeerActor`
Whenever a new connection gets accepted, an instance of `PeerActor` gets created.
Each `PeerActor` keeps a physical a `TCP connection` to exactly one peer.

Responsibilities:
- Maintaining physical connection.
- Reading messages from peers, decoding them, and then forwarding them to the right place.
- Encoding messages, writing them to peers on physical layer.
- Routing messages between `PeerManagerActor` and other peers/

### 2.4 `PeerManagerActor`
`PeerManagerActor` is the main actor of `near-network` crate.
It's acts as a bridge connecting to the world outside, the other peers, and `ClientActor` and `ClientViewActor`, which
handle processing any operations on the chain.
`PeerManagerActor` maintains information about p2p network, and indirectly, through `PeerActor`, connections to all other nodes on the network.
All messages going to other nodes, or coming from other nodes will be routed through this `Actor`.
`PeerManagerActor` is responsible for accepting incoming connections from the outside world.

Responsibilities:
- Accepting new connections
- Maintaining list of `PeerActors`, creating, deleting them
- Routing information about new edges between `PeerActors` and `RoutingTableManager`
- Routing messages between `ViewClient`, `ViewClientActor` and `PeerActors`, and consequently other peers.
- Maintains `RouteBack` structure, which has information on how to send replies to messages

# 3. Code flow - initialization
`PeerManagerActor` actor gets started.
`PeerManagerActor` open tcp server, which listens to incoming connection.
It starts `RoutingTableActor`, which then starts `EdgeValidatorActor`.
When connection incoming connection gets accepted, it starts `PeerActor` on its own thread.

# 4. Code flow - finding first peer to connect to.
Each node maintains list of peers.

New node will get initial list of peers from:
- Genesis config `network.boot_nodes`
- Command line argument `--boot_nodes`

Peer to connect to is chosen at random from list of known nodes by `PeerManagerActor::sample_random_peer` method.

# 5. Edges & network - in code representation
`P2P network` is represented by list of `peers`, where each `peer` is represented by structure `PeerId`,
which is defined by `peer's` public key `PublicKey`.
And list of edges, where each edge is represented by structure `Edge`.

Both are defined below.

# 5.1 PublicKey
We use two types of public keys:
- a 256 bit `ED25519` public key
- a 512 bit `Secp256K1` public key

Public keys are defined in `PublicKey` enum, which consists of those two variants.
```rust
pub struct ED25519PublicKey(pub [u8; 32]);
pub struct Secp256K1PublicKey([u8; 64]);

pub enum PublicKey {
    ED25519(ED25519PublicKey),
    SECP256K1(Secp256K1PublicKey),
}
```

# 5.2 PeerId
Each `peer` is uniquely defined by its `PublicKey`, and represented by `PeerId` struct.
```rust
pub struct PeerId(PublicKey);
```

# 5.3 Edge
Each `edge` is represented by `Edge` struct. It's documented below:

```rust
pub struct Edge {
    /// Each edge consists of unordered pair of public keys of both peers.
    /// `key.0 < key.1` holds true.
    key: (PeerId, PeerId),
    /// `nonce` is unique number representing state of an edge.
    /// Odd number indicates that `edge` has been added, `even` number that it was removed.
    /// New edge starts with value of `1`.
    nonce: u64,
    /// Each `edge` consists of two signatures, one for each `peer`.
    /// It's generated by signing triple (key.0, key.1, nonce) by each `peer` private key.
    /// `Signature` is generated at the time when edge is added, that is when `nonce` is `odd`.
    /// `Signature` can be verified by checking `peers` `PublicKey` against the signature.
    /// `Signature` from peer `key.0`.
    signature0: Signature,
    /// `Signature` from peer `key.1`.
    signature1: Signature,
    /// There are two cases:
    /// - `nonce` is odd, then `removal_info` will be None
    /// - `nonce` is even, then the structure will be a pair with a signature of the party removing
    ///           the edge:
    ///           - `bool` - `false` if `peer0` signed the `edge` `true` if `peer1`.
    ///           - `Signature` - `Signature` of either `peer0` or `peer1`, depending on which peer
    ///           removed the edge.
    removal_info: Option<(bool, Signature)>,
}
```

# 5.4 Graph representation

`RoutingTableActor` is responsible for storing and maintaining set of all edges.
They are kept in `edge_info` data structure of type `HashSet<Edge>`.

```rust
pub struct RoutingTableActor {
    /// Collection of edges representing P2P network.
    /// It's indexed by `Edge::key()` key and can be search through by called `get()` function
    /// with `(PeerId, PeerId)` as argument.
    pub edges_info: HashSet<Edge>,

    /// ...
}
```

# 6. Code flow - connecting to a peer - handshake

When `PeerManagerActor` starts it starts to listen to a specific port.

## 6.1 - Step 1 - `monitor_peers_trigger` runs
`PeerManager` checks if we need to connect to another peer by running `PeerManager::is_outbound_bootstrap_needed` method.
If `true` we will try to connect to new node.
Let's call current node, node `A`.

## 6.2 - Step 2 - choosing node to connect to
Method `PeerManager::sample_random_peer` will be called, and it returns node `B` that we will try to connect to.

## 6.3 - Step 3 - `OutboundTcpConnect` message
`PeerManagerActor` will send to itself a message `OutboundTcpConnect` in order to connect to node `B`.

```rust
pub struct OutboundTcpConnect {
    /// Peer information of the outbound connection
    pub target_peer_info: PeerInfo,
}
```

## 6.4 - Step 4 - `OutboundTcpConnect` message
On receiving the message `handle_msg_outbound_tcp_connect` method will be called, which calls
`TcpStream::connect` to create new connection.

## 6.5 - Step 5 - Connection gets established
Once connection with outgoing peer gets established.
`try_connect_peer` method will be called.
And then new `PeerActor` will be created and started.
One `PeerActor` starts it will send `Handshake` message to outgoing node `B` over tcp connection.

This message contains `protocol_version`, node's `A` metadata, as well as all information necessary to create `Edge`.

```rust
pub struct Handshake {
    /// Current protocol version.
    pub(crate) protocol_version: u32,
    /// Oldest supported protocol version.
    pub(crate) oldest_supported_version: u32,
    /// Sender's peer id.
    pub(crate) sender_peer_id: PeerId,
    /// Receiver's peer id.
    pub(crate) target_peer_id: PeerId,
    /// Sender's listening addr.
    pub(crate) sender_listen_port: Option<u16>,
    /// Peer's chain information.
    pub(crate) sender_chain_info: PeerChainInfoV2,
    /// Represents new `edge`. Contains only `none` and `Signature` from the sender.
    pub(crate) partial_edge_info: PartialEdgeInfo,
}
```

## 6.6 - Step 6 - `Handshake` arrives at node `B`

Node `B` receives `Handshake` message. Then performs various validation checks.

If everything is successful, `PeerActor` will send `Consolidate` message to `PeerManagerActor`.
This message contains everything needed to add `PeerActor` to list of active connections in `PeerManagerActor`.

Otherwise, `PeerActor` will be stopped immediately or after some timeout.

TODO: Rename `Consolidate` to `RegisterPeer` + document all attributes.

```rust
pub struct Consolidate {
    pub(crate) actor: Addr<PeerActor>,
    pub(crate) peer_info: PeerInfo,
    pub(crate) peer_type: PeerType,
    pub(crate) chain_info: PeerChainInfoV2,
    // Edge information from this node.
    // If this is None it implies we are outbound connection, so we need to create our
    // EdgeInfo part and send it to the other peer.
    pub(crate) this_edge_info: Option<EdgeInfo>,
    // Edge information from other node.
    pub(crate) other_edge_info: EdgeInfo,
    // Protocol version of new peer. May be higher than ours.
    pub(crate) peer_protocol_version: ProtocolVersion,
}
```


## 6.7 - Step 7 - `PeerManagerActor` receives `Consolidate` message
In `handle_msg_consolidate` method `Consolidate` message will be validated.
If successful `register_peer` method will be called, which adds `PeerActor` to list of connected peers.

Each connected peer is represented in `PeerActorManager` in `ActivePeer` data structure.

TODO: Rename `ActivePeer` to `ConnectedPeer`.

```rust
/// Contains information relevant to an active peer.
struct ActivePeer {
    addr: Addr<PeerActor>,
    full_peer_info: FullPeerInfo,
    /// Number of bytes we've received from the peer.
    received_bytes_per_sec: u64,
    /// Number of bytes we've sent to the peer.
    sent_bytes_per_sec: u64,
    /// Last time requested peers.
    last_time_peer_requested: Instant,
    /// Last time we received a message from this peer.
    last_time_received_message: Instant,
    /// Time where the connection was established.
    connection_established_time: Instant,
    /// Who started connection. Inbound (other) or Outbound (us).
    peer_type: PeerType,
}
```

## 6.8 - Step 8 - Exchange routing table part 1
At the end of `register_peer` method node `A` will performance `RoutingTableSync` sync.
Sending list of known `edges` representing full graph, and list of known `AnnounceAccount`.
Those will be covered later, in their dedicated sections see sections TODO1, TODO2.

```rust
message: PeerMessage::RoutingTableSync(SyncData::edge(new_edge)),
```
```rust
pub struct SyncData {
    pub(crate) edges: Vec<Edge>,
    pub(crate) accounts: Vec<AnnounceAccount>,
}
```


## 6.9 - Step 9 -  Exchange routing table part 2
Upon receiving `RoutingTableSync` message.
Node `B` will reply with own `RoutingTableSync` message.
