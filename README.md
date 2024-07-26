## Client for WrdHom: the auditable social-media platform

This repository hosts the code for the client for the [WrdHom](https://github.com/chrlyz/wrdhom_contracts) project.

### Install

```console
npm install
```

### Prepare the environment

- Follow the instructions in the [wrdhom_contracts](https://github.com/chrlyz/wrdhom_contracts) repository to deploy your contracts.

- Start `service`, `workers`, and `prover` as explained in the [wrdhom_server](https://github.com/chrlyz/wrdhom_server) repository.

- Set the `NEXT_PUBLIC_POSTS_CONTRACT_ADDRESS`, `NEXT_PUBLIC_REACTIONS_CONTRACT_ADDRESS`, `NEXT_PUBLIC_COMMENTS_CONTRACT_ADDRESS`, and `NEXT_PUBLIC_REPOSTS_CONTRACT_ADDRESS` variables, to the respective public address of each contract (you can find them in the `keys` directory, generated in your `wrdhom_contracts` repository).

### Start client in development mode

```console
npm run dev
```

### Create optimized production build

```console
npm run build
```

### Start optimized production client

```console
npm run start
```

### License

[MIT](LICENSE)
