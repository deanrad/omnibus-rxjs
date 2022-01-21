# sol-trivia

A trivia game, built in an evented way with `omnibus-rxjs`, with a React Ink CLI front-end and using the Solana blockchain for storage.

# Solana Wallet

This project uses an emcee wallet based on this keyphrase: `absorb harvest off stone version toilet license town legend mixture frequent unfair home party chief cereal frost clarify remain maximum invest pull strategy crunch`.

Make sure you [install the Solana CLI tools](https://docs.solana.com/cli/install-solana-cli-tools), and that you get the following output.

```
$ solana-keygen pubkey ./solana/emcee_wallet.json
4PNBPR9NtGSsmscgZ616qbzuxioPSDsVAXAVmyEXzaXF
```

Now set this to be your default key, and you are pointed at the devnet, and this account has some sol (use `solana airdrop 1` if you need some free devnet SOL):

```
solana config set -k ./wallets/emcee_wallet.json
solana config set --url https://api.devnet.solana.com
solana balance
```

Likewise there is a player wallet: `player_wallet.json` which should also have a balance.

# Overview

A game is an account on the Solana blockchain

The player will submit answers by sending a transaction to the emcee, with a JSON object in its Memo field.

```
solana transfer 4PNBPR9NtGSsmscgZ616qbzuxioPSDsVAXAVmyEXzaXF 0.0001 --from wallets/player_wallet.json --with-memo '{"question": 1, "answer": "5 days"}'
```

```
solana transaction-history 4PNBPR9NtGSsmscgZ616qbzuxioPSDsVAXAVmyEXzaXF --show-transactions
```

The [blockchain explorer for the emcee account](https://explorer.solana.com/address/4PNBPR9NtGSsmscgZ616qbzuxioPSDsVAXAVmyEXzaXF?cluster=devnet) will show the transaction.
