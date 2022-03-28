# Token Balance

Examples from our [RPC](https://docs.near.org/docs/develop/front-end/rpc) are used. If you want to look at information about archival nodes (more than 2 days ago), please use `archival` prefix in your URL (e.g. `https://archival-rpc.mainnet.near.org`) In this article, we always use `POST` methods to the same URL `https://archival-rpc.mainnet.near.org`. Body:

```
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "EXPERIMENTAL_tx_status",
  "params": ["8uxq5BAC4zZL4Set7gtraqZSWduYXRUiNggpKhWmBnzK", "nf-finance.near"]
}
```

Every [account](https://docs.near.org/docs/develop/front-end/rpc#view-account) has liquid balance (called `amount`) and stake (called `locked`). All calculation in tables are in yoctonear.

Total supply is the amount of tokens in the whole system. Each example is selected at the moment when no other changes is performed in the blockchain, so the only example could affect total supply.

### Why does my balance change?

There are different scenarios why the amount of tokens could change on the account. Let's look at it on real examples.

Each example (except rewarding) contains fees user pays for the operation. You could read about fees calculation [here](https://nomicon.io/Economics/README.html#transaction-fees).

#### Transfer of tokens

https://explorer.mainnet.near.org/transactions/6gUVYsdAsStzU5H2AyW7bxAdEL4RvJv5PL3b8DRnPVED

`pine.near` sent 1.64234 tokens to `taka.near`

| block height | pine.near amount          | taka.near amount           | total supply                       | explanation                                                                                              |
| ------------ | ------------------------- | -------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 32786820     | 1997461904089428600000000 | 17799799178272291100000000 | 1020393325841554327182410255742095 | initial state                                                                                            |
| 32786821     | 355076598029241100000000  | 17799799178272291100000000 | 1020393325841554327182410255742095 | pine.near lost some tokens for transferring and fees (with a margin, some tokens will be returned)       |
| 32786822     | 355076598029241100000000  | 19442139178272291100000000 | 1020393325841532008926160255742095 | taka.near received exactly 1.64234 tokens. Total supply was deducted for making receipt from transaction |
| 32786823     | 355077267576928600000000  | 19442139178272291100000000 | 1020393325841509690669910255742095 | pine.near received a change. Total supply was deducted for executing receipt                             |
| 32786824     | 355077267576928600000000  | 19442139178272291100000000 | 1020393325841509690669910255742095 | final state                                                                                              |

For such kind of transactions, sender pays 2 fees: for making receipt from transaction; for executing receipt.

We also have receipt for returning a change: it is made without fee.

For this example, final cost of transferring tokens was `22318256250000000000 * 2 / 10^24 = 0.0000446365125` Near Tokens.

#### Creating the account

https://explorer.mainnet.near.org/transactions/Hant2anxPJHm3sh8ncc5AWn5VpXTmwq6iyEumVoQcUJP

`nearcrowd.near` created account `app.nearcrowd.near`, gave the access key, transfer some tokens for that account. These 3 actions are usually go together.

| block height | nearcrowd.near amount       | app.nearcrowd.near amount   | total supply                       | explanation                                                                                                                                                  |
| ------------ | --------------------------- | --------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 32396638     | 117975002547050142700000000 | -                           | 1019767988635277999737307820909366 | initial state (app.nearcrowd.near does not exist)                                                                                                            |
| 32396639     | 17974916362372455200000000  | -                           | 1019767988635277999737307820909366 | nearcrowd.near spent tokens on transfer and fees (with a margin, some tokens will be returned). Total supply is not changed for now: process is not finished |
| 32396640     | 17974916362372455200000000  | 100000000000000000000000000 | 1019767988635235544231057820909366 | app.nearcrowd.near was created with initial amount of tokens. Total supply was deducted for making receipt from transaction                                  |
| 32396641     | 17974917636037642700000000  | 100000000000000000000000000 | 1019767988635193088724807820909366 | nearcrowd.near received a change. Total supply was deducted for executing receipt                                                                            |
| 32396642     | 17974917636037642700000000  | 100000000000000000000000000 | 1019767988635193088724807820909366 | final state                                                                                                                                                  |

For such kind of transactions, sender pays 2 fees: for making receipt from transaction; for executing receipt.

We also have receipt for returning a change: it is made without fee. For this example, final cost of creating account and transferring tokens were `42455506250000000000 * 2 / 10^24 = 0.0000849110125` Near Tokens.

#### Deleting the account

https://explorer.mainnet.near.org/transactions/8nZeedU6RUnj65zxQYHrGx2Urx5sLe6J2T123xSNL2RK

It's not possible to delete not your account: user is always deleting their own account. User should provide beneficiary account that receive all tokens. User could provide the account that does not exist, in such case the tokens will burn.

`wxx.near` deleted their account with beneficiary `vng.near`

| block height | wxx.near amount          | vng.near amount           | total supply                       | explanation                                                                            |
| ------------ | ------------------------ | ------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------- |
| 31961454     | 456172376354355113240646 | 719560525627200400000000  | 1019079411898934110106918776083373 | initial state                                                                          |
| 31961455     | -                        | 719560525627200400000000  | 1019079411898934110106918776083373 | wxx.near was deleted                                                                   |
| 31961456     | -                        | 1175681792281555513240646 | 1019079411898883000406918776083373 | vng.near received tokens (minus fee), total supply was deducted by fees getting burned |
| 31961457     | -                        | 1175681792281555513240646 | 1019079411898883000406918776083373 | final state                                                                            |

For such kind of transactions, sender pays 2 fees: for making receipt from transaction; for executing receipt.

Note: we do not have the change. For this example, final cost of deleting account was `25554850000000000000 * 2 / 10^24 = 0.0000511097` Near Tokens.

#### Calling a function

https://explorer.mainnet.near.org/transactions/8oBZrKk8jkAzrsYasoL2DW9Yg6K2GznLhvoiXmSm7kHe

`relayer.bridge.near` invoked a function in the contract of `client.bridge.near`

| block height | relayer.bridge.near amount  | client.bridge.near amount    | total supply                       | explanation                                                                                           |
| ------------ | --------------------------- | ---------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 32451005     | 927695372457390994900000000 | 1018709186646522709500000000 | 1019836940956022237114094657887001 | initial state                                                                                         |
| 32451006     | 927676238135400182753029324 | 1018709186646522709500000000 | 1019836940956022237114094657887001 | the function is invoked, relayer.bridge.near spent the tokens on the fees (with a margin)             |
| 32451007     | 927676238135400182753029324 | 1018710176966066945800000000 | 1019836940955771421812122457887001 | author of the function gets the reward. Total supply was deducted for making receipt from transaction |
| 32451008     | 927691569761639596000000000 | 1018710176966066945800000000 | 1019836940953209860906932057887001 | relayer.bridge.near received a change for fees. Total supply was deducted for executing receipt       |
| 32451009     | 927691569761639596000000000 | 1018710176966066945800000000 | 1019836940953209860906932057887001 | final state                                                                                           |

For such kind of transactions, sender pays 2 fees: for making receipt from transaction; for executing receipt. Receiver gets part of the fee as a reward for a possibility to invoke their function.

For this example, final cost of invoking the function was `(250815301972200000000 + 3551880449426700000000) / 10^24 = 0.0038026957513989` Near Tokens. Reward was `0.0009903195442363` Near Tokens.

TODO: add Nomicon link about royalties when [this issue](https://github.com/near/NEPs/issues/198) will be resolved.

**The example of calling a function could be more complex.**

https://explorer.mainnet.near.org/transactions/DuGWWTK2sAxjffifJiJBv6hs3Hc8MdhpHnzgRJryV4Be

`lulukuang.near` invokes a function in a protocol of `berryclub.ek.near`. It triggers `berryclub.ek.near` to send the money to third account, `farm.berryclub.ek.near`. So we need to analyze 3 accounts in this scenario.

| block height | lulukuang.near amount      | berryclub.ek.near amount    | farm.berryclub.ek.near amount | total supply                       |
| ------------ | -------------------------- | --------------------------- | ----------------------------- | ---------------------------------- |
| 32448898     | 13565822561282329011544599 | 468266310630308773724199697 | 1795104370794561556009708395  | 1019836941925593000345074757887001 |
| 32448899     | 13553154814244264373824919 | 468266310630308773724199697 | 1795104370794561556009708395  | 1019836941925593000345074757887001 |
| 32448900     | 13553154814244264373824919 | 468011594500695874498002337 | 1795104370794561556009708395  | 1019836941925350190357602757887001 |
| 32448901     | 13563348945268324922643655 | 468011594500695874498002337 | 1795359347718068910135905755  | 1019836941924550160945561757887001 |

#### Adding the key

https://explorer.mainnet.near.org/transactions/A9767GbmRCLdeCpZYfKTQUqe17KyAu5JrZHanoRChMSV

`slavon.near` added the key to their own account.

| block height | slavon.near amount        | total supply                       | explanation               |
| ------------ | ------------------------- | ---------------------------------- | ------------------------- |
| 32452281     | 4110095852838015413724607 | 1019836940258537920949718457887001 | initial state             |
| 32452282     | 4110053774694109613724607 | 1019836940258537920949718457887001 | fees are gone             |
| 32452283     | 4110053774694109613724607 | 1019836940258495842805812657887001 | total supply was deducted |
| 32452284     | 4110053774694109613724607 | 1019836940258495842805812657887001 | final state               |

For such kind of transactions, sender pays 2 fees: for making receipt from transaction; for executing receipt.

Note: we do not have the change. For this example, final cost of adding the key was `21039071952900000000 * 2 / 10^24 = 0.0000420781439058` Near Tokens.

#### Deleting the key

https://explorer.mainnet.near.org/transactions/CfuXcVPy7vZNVabYKzemSwDdNF9fnhbMLaaDKjAMyw8j

`77yen.near` deleted the key from their own account.

| block height | 77yen.near amount        | total supply                       | explanation               |
| ------------ | ------------------------ | ---------------------------------- | ------------------------- |
| 32429428     | 350892032360972200000000 | 1019836950055687104230777157887001 | initial state             |
| 32429429     | 350851431135972200000000 | 1019836950055687104230777157887001 | fees are gone             |
| 32429430     | 350851431135972200000000 | 1019836950055646503005777157887001 | total supply was deducted |
| 32429431     | 350851431135972200000000 | 1019836950055646503005777157887001 | final state               |

For such kind of transactions, sender pays 2 fees: for making receipt from transaction; for executing receipt.

Note: we do not have the change. For this example, final cost of adding the key was `20300612500000000000 * 2 / 10^24 = 0.000040601225` Near Tokens.

#### Deploying the contract

https://explorer.mainnet.near.org/transactions/3DN4XiQCX2EeSN5sjiaB4WBjJizthbhUfqQhCBcZK57A

`ref-finance.near` deployed the contract.

| block height | ref-finance.near amount    | total supply                       | explanation               |
| ------------ | -------------------------- | ---------------------------------- | ------------------------- |
| 32378845     | 42166443062029468200000000 | 1019767995481527182962669020909366 | initial state             |
| 32378846     | 42165929455413658400000000 | 1019767995481527182962669020909366 | fees are gone             |
| 32378847     | 42165929455413658400000000 | 1019767995481013576346859220909366 | total supply was deducted |
| 32378848     | 42165929455413658400000000 | 1019767995481013576346859220909366 | final state               |

For such kind of transactions, sender pays 2 fees: for making receipt from transaction; for executing receipt.

Note: we do not have the change. For this example, final cost of deploying the contract was `256803307904900000000 * 2 / 10^24 = 0.0005136066158098` Near Tokens.

#### Receiving the reward for being validator

NB: No transaction/receipt is associated with such type of balance changing.

On the boundary of the epochs, validators receive reward. The platform gives 10% of minted tokens to special account `treasury.near`. You could think about `treasury.near` as about reward to the whole system to keep it in working order. Total sum of the rewards (including `treasury.near`) is the increase of total supply in the system.

|                | total supply                       | treasury.near                   | comment                         |
| -------------- | ---------------------------------- | ------------------------------- | ------------------------------- |
| block 32716252 | 1020253586314335829144818854680815 | 2047777174062240806436499682917 |                                 |
| block 32716253 | 1020323466696960098722157540903707 | 2054765212324667764170368305209 |                                 |
| difference     | 69880382624269577338686222892      | 6988038262426957733868622292    | treasury received 10% of reward |

If the validator does not change the stake during the epoch, all the reward will go to their stake. Liquid balance will remain the same.

| block height | baziliknear.poolv1.near amount | baziliknear.poolv1.near locked (stake) |
| ------------ | ------------------------------ | -------------------------------------- |
| 32716252     | 87645929417382101548688640817  | 4051739369484142981303684413288        |
| 32716253     | 87645929417382101548688640817  | 4052372556336355400023161624996        |

`baziliknear.poolv1.near` had 4M tokens on their locked balance. Their reward for the epoch was `633186852212418719477211708 / 10^24 = 633.1868522124187` tokens.

If the validator decrease the stake during the epoch, it will be actually decreased at the boundary between the epochs. The reward will also go to the liquid balance in such case.

| block height   | astro-stakers.poolv1.near amount | astro-stakers.poolv1.near locked (stake) | d1.poolv1.near amount         | d1.poolv1.near locked (stake)   | artemis.poolv1.near amount      | artemis.poolv1.near locked (stake) |
| -------------- | -------------------------------- | ---------------------------------------- | ----------------------------- | ------------------------------- | ------------------------------- | ---------------------------------- |
| block 32716252 | 75643656264518222662518079298    | 14871875685703104705137979278533         | 39579636061549418675704317463 | 9002215926886116642974675441492 | 195455191635613196116221250     | 3155647821138218410536743286795    |
| block 32716253 | 77968865959341187332341390150    | 14871875685703104705137979278533         | 40986873900034981089977167653 | 9002215926314400176270075441492 | 3155843276329854023732859508045 | 0                                  |
| diff           | 2325209694822964669823310852     | 0                                        | 1407237838485562414272850190  | -571716466704600000000          | 3155647821138218410536743286795 | -3155647821138218410536743286795   |

`astro-stakers.poolv1.near` decided to put the reward to liquid balance, so they invoked a command (e.g. `ping`). We can see that the stake does not change between the epochs.

`d1.poolv1.near` decided to slightly decrease the stake size, so the reward and the part of the stake are on the liquid balance.

`artemis.poolv1.near` received the reward and stopped being validator at that epoch, so all the stake are on the liquid balance, stake becomes zero.

The reword value is calculated based on stake size and number of calculated blocks per epoch. Read more about it [here](https://nomicon.io/Economics/README.html#rewards-calculation)

If the validator increase the stake during the epoch, stake will be increased in next few blocks, we do not need to wait for the moment of the epoch boundary. For current epoch, blockchain will take into account stake value fixed at the start of the epoch.

https://explorer.mainnet.near.org/transactions/HajXjY1gSf47jakXP44ERecjFE2hFvF4FgRyQzNdZzDZ

`elecnodo.near` put 245.7788678019393 tokens from its locked account `57bea511f28a9c0d44148c332826a9b9fb14f13c.lockup.near` to a staking pool `staked.poolv1.near`

Read more about epochs changing [here](https://github.com/near/NEPs/tree/master/specs/BlockchainLayer/EpochManager).
