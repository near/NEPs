- Proposal Name: Network specification
- Start Date: 2019-08-26
- NEP PR: [nearprotocol/neps#0000](https://github.com/nearprotocol/neps/pull/0000)

# Summary
[summary]: #summary

Specification of the networking layer that peers use to communicate.
Includes implementation overview of peer discovery, handshake and reputation.
Does not include the format of the actual blockchain protocol.

# Motivation
[motivation]: #motivation

To provide actually secure and efficient routing, especially among the validators, we postulate that account information and cryptographic signatures backed directly or indirectly by stake are required.
This network specification describes all of the protocols and data structures to connect, handshake, discover peers and maintain connections and an integration with the blockchain itself.

This document should serve as reference for all the clients to implement networking layer.

# Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

## Routing Table

### API
Routing table is accessible from peer manager.

- **Find route to PeerID** Find next peer in the path to some PeerID. This PeerID should be known to us.
- **Find route to AccountID** Find next peer in the path to some AccountID. This AccountID should be known to us.
- **Add AccountID** Associate AccountID with PeerId. If PeerID associated with this account was not known, it is added.
- **Add Connection** New connection between two PeerID.
- **Remove Connection** Remove connection between two PeerID

### Details

- Network information will be stored as a graph. Nodes are peers and Edges are active connections between peers.
- Nodes can be added to the network.
- Edges can be added and removed to the network.
- Nodes maintain shortest path to every other node in the network. In practice only next hop is maintained and not the entire route. This is recalculated periodically. When more than one nodes works as next hop Round Robin is used to choose one.

**Recalculation Policy**

After new edge update routing table recalculation is scheduled. This prevents high CPU loads from computing shortest path all the time, and allows processing of batch of updates in a single run. The variable `ROUTING_TABLE_CALC_IDLE_TIME` denotes how much time we spent before recalculating the routing table from scratch. This period should not be too large, since in the middle time the routing table is out of sync.

### Routing back

It is possible that node A is known to B but not the other way around. In case node A sends a request that requires a response to B, the response is routed back through the same path used to send the message from A to B. This are special types of messages.

- **Store Previous Link** Request Messages are those that expect a response, and a route back is stored. This will expire after some fixed timeout or after a response is delivered. We store hash of the message to identify sender.
- **Get Previous Link** Find previous link for a message. Proposal: nodes can try to route the message if it doesn't have a direct connection to previous link anymore.

## Peer Manager

### API

- **Broadcast Message** (This will use broadcast idea from )
- **Send Message to PeerID** (Message will be routed to known PeerID) This will use Find route to peer id from routing table. Messages can travel with a TTL, so they get dropped after lurking around the network. This also avoid loops when the view of the graph is not the same to all nodes.
- **Send Direct Message PeerID** In this case PeerID must be an active peer.
- **Ban PeerID**

### Storing information

- Active Peers
- Banned peers
- Peer information (This is a long term database where we store information of all peers we have ever met).

## Sync Service

This service will handle keeping the network view for every peer up to date using Broadcast mechanism. This will manage MST. When new edge is created this information is propagated through the network.

### Edges

Edge instance contains the following information:

- `peer0` Endpoint of this edge.
- `peer1` Endpoint of this edge.
- `edge_type` Enum that takes one of two values L(`Added`, `Removed`). It represents the addition or deletion of one edge in the network respectively.
- `nonce` Used to have an order among different edges between the same peers. Edge with higher nonce comes later and should be preferred. It also avoid reusing the same edge by malicious actors.
- `signature0` Required for validating the edge. (Both in addition and deletion).
- `signature1` Required for validating the edge. (Only in addition, in deletion only one signature is required).

Since edges are undirected the canonical representation requires that `peer0 < peer1` (if PeerId are interpreted as integers).

### Broadcast mechanics

### Broadcast routing API

For message broadcasting nodes maintain a dynamic spanning tree which adapts fast to new edges additions and removals [1](#reference). Broadcasted messages will travel in a near-optimal way through this tree.

### Hard sync

Also there is a hard sync mechanism for two nodes, that is used when new connection between two nodes is established.  Periodically nodes will run this hard sync to become up to date. The period to hard sync is always large enough so that changes are allowed to get propagated through the spanning tree.
If view of the network differ by a large margin nodes will send their full view of the graph. Useful when new nodes join for the first time.
Otherwise they will use bloom filters to find differences.

### Announce Account

Data structure containing new account information.

## Connecting Service

This service will handle active connections.

- It will determine if an incoming connection should be established. When some node is trying to establish a new connection if peers slots is full we will ping peer with latest last message. If ping fails, we drop our connection and establish connection with new peer.
- It will try to establish new connections in several situations:
  - Bootstrapping (When joining the network for the first time).
  - Network balancing. We will have high tolerance to support connections to nodes that need to be close to use (same shard or block producers). Though we will have this number capped in case
  - Low number of outbound connections.
- Remove some of the active connections if the number of active peer goes over some threshold. We allow number of active peers to be unbound in case we need to establish new connections because lack of outbound connections, or because we becoming part of new shard.

### Bootstrapping

When node starts it have two lists:

- Bootstrap nodes, nodes that are well known in the eco-system as nodes that provide information about the network.
- Known peers, peers that this node has connected before in previous sessions and stored on disk to persist between runs. This list can be empty if this is first time to start the node.

Both of these lists are merged and node starts by connecting to `max_peers` random peers from this list.
If there is not enough peers in the lists, node periodically tries to connect to newly discovered peers with a exponential back off timeout (in case network is smaller than K in the first place) until it switches to *regular* mode. *Regular* mode means that node periodically checks if there is not enough peers (due to disconnects) and connects to new peers.

Additionally, to prevent various eclipse attacks where attacker forces node to have all incoming connection to them, we require node to have at least `min_outgoing_peers` outgoing connections.

In pseudo code, this would look like:

```pseudo-code
  peers = (bootstrap | known_peers) - banned_peers
  while true
    if len(incoming_peers) + len(outgoing_peers) > max_peers && len(outgoing_peers) > min_outgoing_peers:
        continue
    peers_to_connect = max(max_peers - len(outgoing_peers) - len(incoming_peers), min_outgoing_peers - len(outgoing_peers))
    sample_peers = sample(peers, peers_to_connect)
    for peer in sample_peers:
        connect(peer)
    wait_time = max(wait_time * back_off, peer_reconnect_wait)
    sleep(wait_time)
```

### API

- **Add epoch_hash/height info:** Add information of all validators that belong to the same shard as we do for every epoch.
- **Start active epoch_hash/height:** Active epoch are usually current and next epoch. When new epoch gets active this service will start to establish connection between peers in that epoch.
- **Finish active epoch_hash/height:** This epoch_hash already finished so, connections made because of are marked as not important anymore, so can be dropped if the routing table grows

### Policy

- At all moments we should try to have a minimum number of outbound connections.
- We will accept (or try) connections to other validators in our same shard.

### Removing edges policies

    - Keep connections to node in the active set.
    - Keep connections to latest `OUTBOUND_PEERS_CONSTANT`
    - Keep connections to latest `NUM_PEERS_CONSTANT`
    - Keep connections marked as `IMPORTANT` (This will be used to keep broadcast spanning tree connections, maybe can be used to hard code some connections).
    - List all other connections and remove them as long as

## Peer

### Handshake

When one peer creates outgoing connection to another peer, they send a `Handshake` message.
This message informs the other peer about their ID, protocol version and provides some blockchain information to check that these two peers are on same one (e.g. `genesis hash`).
After handshake sent, peer wait `handshake_timeout` and if within this time message wasn't received, this peer disconnects and adds to the Ban list.

When incoming connection is received,

Outgoing:

```pseudo-code
    connect(peer.ip)
    handshake = sign(Handshake { protocol_version, genesis_hash, node_id.public_key }, node_id.secret_key)
    send(handshake)
```

After connection is consolidated, they will start syncing its network POV and will broadcast the new edge to the network.

### Peer Request/Response

Peers on the network are open to provide information about other peers, even to not connected peers. If some not connected peer try to abuse this we disconnect from it and ban. This will be useful for Peers that are joining the network.

## Network Types of Messages

Where we describe all possible types of messages happening at the networking level. Notice that protocol level messages are wrapped around `ProtocolMessage`. This specification should be agnostic to the content of such messages.

## Security

Messages exchanged between routed (both direct or routed) are cryptographically signed with sender private key. Nodes ID contains public key of each node that allow other peer to verify this messages. To keep secure communication most of this message requires some nonce/timestamp that forbid a malicious actor reuse a signed message out of context.

In the case of routing messages each intermediate hop should verify that message hash and signatures are valid before routing to next hop.

# Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

# Drawbacks
[drawbacks]: #drawbacks

## Possible attacks

We identify list of possible attacks, their severity and resulting reaction of the node:

- Invalid signed handshake. Ban IP address. Note that user might end up in the situation when an attacker took over their router and via man-in-the-middle responds to messages with invalid signature. This node will be left without known peers, but we think this is the safest outcome and requires human intervention.

- Peer responds with false `latest_height` / `latest_weight`. The attacker might want to stall node in syncing mode, waiting for headers that don't exist by providing way to large `latest_height`. The only way to actually verify this is to try to pull headers from this peer. As we start requesting headers, a timer setup. If peer doesn't respond to the `HeaderRequest` within this time, we Ban the peer for a medium period of time. Additional heuristic can be added, which node will be banned if their `latest_height` is above some threshold of heights known from other peers.

- Create several ghost accounts with ghost connections among them and flood the network with them. Nodes will be calculating shortest path frequently and having many reachable nodes in the routing table increase the cost of such operation.

### Eclipse attack manipulating reputation

A malicious actor put as little stake as possible in the blockchain to become validator from as much peer ids as possible. All this peer id become relevant (maybe gaining reputation through time) and tries to flood some participants active connections with their forged peer ids.

Outbound connections might not be an effective resource to avoid such situation if malicious actor plans it attack with some time, though waiting to all its nodes get high reputation (this is undetectable, mostly because malicious actor needs to do nothing bad).

Also in order to achieve this it can also corrupt (take control) of high reputation nodes which is not that unrealistic.

One defense against such an attack right now is part of the balance mechanism, where validators will make direct connections to other validators, hence keeping at least one connection to an honest node.

Proposal: We can fetch some reputable peers from a UDP channel from other nodes we know in the network and randomly rotate some (few) slots of our connected peers. Trying to establish this way new outbound (also inbound) connections to other peers.

**WARNING**: This situation taken to an extreme might lead to a centralized system where all honest nodes are connected to a malicious node without knowing the existence of other honest nodes.

# Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives

Ethereum uses Kademlia table for new peer discovery.
Kademlia is a distributed hash table (DHT), whose function is mostly to store pieces of data across a peer-to-peer network. Kademlia wasn't also designed with the goal to prevent malicious agents attack (as usually it's used to store content addressable data which is self verifiable). [2](#references) has shown some easy ways to attack Kademlia table peer-to-peer discovery process.

# Unresolved questions
[unresolved-questions]: #unresolved-questions

- How can you avoid network spam? (This is sybil attack at the network layer). Malicious actor can forge identities (PeerId/IP/Port) cheaply and inject tons of new nodes to the system. We should be able to allow new comers who are genuinely trying to become part of the network, while disallow ghost identities which are only trying to poison the routing tables. This is an important challenge for our current network design, since every nodes stores the network representation as part of the routing protocol, and this can become harmful as the network grows.

- Nodes that don’t route messages through it are not been detected or punished.

# Future possibilities
[future-possibilities]: #future-possibilities

Add a reputation mechanism. Using reputation is somehow easy to design a strategy that effectively avoids both, sybil and eclipse attack; also it can be leveraged to improve network balancing using connections from well known (reputable) nodes. But setting up a reputation mechanism increase notably the complexity of the system, and it is very hard to design it off-chain in such a way that can’t be manipulated by malicious actor. We are still researching in this area,

# References
[references]: #references

1. [Epidemic Broadcast Tree](https://www.gsd.inesc-id.pt/~ler/reports/srds07.pdf)
2. Low-Resource Eclipse Attacks on Ethereum’s Peer-to-Peer Network.
