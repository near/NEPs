import DocCardList from '@theme/DocCardList';
import {useCurrentSidebarCategory} from '@docusaurus/theme-common';

# Standards

<DocCardList items={useCurrentSidebarCategory().items}/>

## Table of Contents

- [Fungible Token](Tokens/FungibleToken/README.md)
    - [Core Standard](Tokens/FungibleToken/Core.md)
    - [Metadata](Tokens/FungibleToken/Metadata.md)
    - [Events](Tokens/FungibleToken/Event.md)
- [Non-Fungible Token](Tokens/NonFungibleToken/README.md)
    - [Core Standard](Tokens/NonFungibleToken/Core.md)
    - [Metadata](Tokens/NonFungibleToken/Metadata.md)
    - [Approval Management](Tokens/NonFungibleToken/ApprovalManagement.md)
    - [Enumeration](Tokens/NonFungibleToken/Enumeration.md)
    - [Royalty Payout](Tokens/NonFungibleToken/Payout.md)
    - [Events](Tokens/NonFungibleToken/Event.md)
- [Storage Management](StorageManagement.md)
- [Events Format](EventsFormat.md)
