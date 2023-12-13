export default function ConnectWallet({
    walletConnection
}: {
    walletConnection: () => void;
}) {
    return (
        <button onClick={walletConnection} className="hover:underline mb-4">
            {'-> Connect wallet to be able to post'}
        </button>
    )
}