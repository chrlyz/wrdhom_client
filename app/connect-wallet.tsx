export default function ConnectWallet({
    walletConnection
}: {
    walletConnection: () => void;
}) {
    return (
        <button onClick={walletConnection} className="cursor-pointer">
            {'-> Connect wallet to be able to post'}
        </button>
    )
}