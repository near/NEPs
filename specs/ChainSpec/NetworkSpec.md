# Network

Network layer constitutes the lower level of the NEAR protocol and is ultimately responsible of transporting messages between peers. To provide an efficient routing it maintains a routing table between all peers actively connected to the network, and send message between them using best paths. There is a mechanism in place that allows new peers joining the network to discover other peers, and rebalance network connections in such a way that latency is minimized. Cryptographic signatures are used to check identities from peers participating in the protocol since it is non-permissioned system.

This document should serve as reference for all the clients to implement networking layer.

## Messages

All data structure used for messages between peers are enumerated in [Message](Messages.md).

## Discovering the network

When a node start for the first time it tries to connect to a list of bootstrap nodes specified via a config file.

It is expected that a node on a regular basis request a list of peers from its neighboring nodes to learn about other nodes in the network. This will allow every node to discover each other, and have relevant information to try to establish a new connection with it. When a node receive a message of type [`PeersRequest`](Messages.md#PeersMessage) it is expected to answer with a message of type [`PeersResponse`](Message.md#PeersMessage) with information from healthy peers known to this node. Both of this message are unrestricted, i.e. can be sent at any moment without incurring in a fault, but beware about the policy to [ban for abusive behavior](#Abusive-behavior).

### Handshakes

To establish new connections between pair of nodes, they will follow the following protocol. Node A open a connection with node B and sends a [Handshake](Messages.md#Handshake) to it. If handshake is valid (see reasons to [decline the handshake](#Decline-handshake)) then node B will proceed to send [Handshake](Messages.md#Handshake) to node A. After each node accept a handshake it will mark the other node as an active connection, until one of them stop the connection.

[Handshake](Messages.md#Handshake) contains relevant information about the node, the current chain and information to create a new edge between both nodes.

#### Decline handshake

When a node receive a handshake from other node it will decline this connection if one of the following situations happens:

1. Other node has different genesis.
2. Edge nonce is too low

#### Edge

Edges are used to let other know in the network that there is currently an active connection between a pair of nodes. See the signature of [this data structure](Messages.md#Edge).

If the nonce of the edge is odd, it denotes an `Added` edge, otherwise it denotes a `Removed` edge. Each node should keep track of the nonce used for edges between every pair of nodes. Peer C believe that peer A and B are currently connected if and only if the edge with higher nonce known to C about them have odd nonce.

When two nodes successfully connect to each other, they broadcast the new edge to let other peers know about this connection. When a node is disconnected from other node, it should bump the nonce by 1, sign the new edge and broadcast it to let other nodes know that the connection was removed.

A removed connection will be valid, if it contains valid information from the added edge it is invalidating. This will prevent peers bump nonce by more than one when deleting an edge.

When node A propose an edge to B with nonce X, it will only accept it and sign it if:

- X = 1 and B doesn't know about any previous edge between A and B
- X is odd and X > Y where Y is the nonce of the edge with higher nonce between A and B known to B.

## Routing Table

Every node will maintain a routing table with all existing connections and relevant information to route messages. The explicit graph with all active connection is stored at all times.

```rust
struct RoutingTable {
    /// PeerId associated for every known account id.
    account_peers: HashMap<AccountId, AnnounceAccount>,
    /// Active PeerId that are part of the shortest path to each PeerId.
    pub peer_forwarding: HashMap<PeerId, HashSet<PeerId>>,
    /// Store last update for known edges.
    pub edges_info: HashMap<(PeerId, PeerId), Edge>,
    /// Hash of messages that requires routing back to respective previous hop.
    pub route_back: HashMap<CryptoHash, PeerId>,
    /// Current view of the network. Nodes are Peers and edges are active connections.
    raw_graph: Graph,
}

pub struct Graph {
    adjacency: HashMap<PeerId, HashSet<PeerId>>,
}
```

`RoutingTable` should be update accordingly the node receives updates from the network. There are four types of updates `RoutingTable` cares about:

- [Adding Edge](#Add-edge)
- [Removing Edge](#Remove-edge)
- [Route back message](#Route-back-messages)
- [Announce account](#Announce-account)

### Routing

When a node needs to send a message to another peer, it checks in the routing table if it is connected to that peer, possibly not directed but through several hops. Then it select one of the shortest path to the target peer and send a [`RoutedMessage`](Messages.md#RoutedMessage) to the first peer in the path.

When it receives a `RoutedMessage`, it check if it is the target, in that case consume the body of the message, otherwise it finds a route to the target following described approach and send the message again. Is is important that before routing a message each peer check signature from original author of the message, passing a message with invalid signature can result in ban for sender. It is not required however checking the content of the message itself.

Each `RoutedMessage` is equipped with a time-to-live integer. If this message is not for us, we decrement by one this field, if value is 0, we drop this message, otherwise we forward it.

#### Routing back

It is possible that node A is known to B but not the other way around. In case node A sends a request that requires a response to B, the response is routed back through the same path used to send the message from A to B. This are special types of messages.

- **Store Previous Link** Request Messages are those that expect a response, and a route back is stored. This will expire after some fixed timeout or after a response is delivered. We store hash of the message to identify sender.
- **Get Previous Link** Find previous link for a message. Proposal: nodes can try to route the message if it doesn't have a direct connection to previous link anymore.

### Synchronization

Routing tables is kept up to date between the network with two mechanisms:

- First sync: When two nodes connect with each other they exchange all information in their routing tables. More details in [Handshake](#Handshake).
- Broadcasting: When a node learns new information that is added to the routing table it broadcast that information to all active node currently connected to it. More details in [Edge](#Edge) and [Announce Account](#Announce-account).

## Security

Messages exchanged between routed (both direct or routed) are cryptographically signed with sender private key. Nodes ID contains public key of each node that allow other peer to verify this messages. To keep secure communication most of this message requires some nonce/timestamp that forbid a malicious actor reuse a signed message out of context.

In the case of routing messages each intermediate hop should verify that message hash and signatures are valid before routing to next hop.

### Abusive behavior

When a node A sends more than `MAX_PEER_MSG_PER_MIN` messages per minute to node B, it will be banned and unable to keep sending messages to it. This a protection mechanism against abusive node to avoid being spammed by some peers.

## Possible attacks

### Overloading routing table

Create several ghost accounts with ghost connections among them and flood the network with them. Nodes will be calculating shortest path frequently and having many reachable nodes in the routing table increase the cost of such operation.

## Implementation Details

There are some issues that should be handled by the network layer but details about how to implement them are not enforced by the protocol, however we propose here how to address them.

### Balancing network

[Github comment](https://github.com/nearprotocol/nearcore/issues/2395#issuecomment-610077017)
