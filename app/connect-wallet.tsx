export default function ConnectWallet({
    walletConnection
}: {
    walletConnection: () => void;
}) {
    return (
        <button onClick={walletConnection}>
            Connect wallet to be able to post
        </button>
    )
}