export default function InstallWallet({
    hasWallet
 }: {
    hasWallet: null | boolean 
}) {
    if (!hasWallet) {
        return (
          <form action="https://aurowallet.com">
            <input type="submit" value="Install Auro Wallet" />
          </form>
        )
      } else return
}