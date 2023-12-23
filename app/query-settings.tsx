import { Dispatch, SetStateAction } from "react";

export default function QuerySettings({
    visibleSettings,
    showSettings,
    howManyPosts,
    setHowManyPosts,
    fromBlock,
    setFromBlock,
    toBlock,
    setToBlock
}: {
    visibleSettings: boolean,
    showSettings: () => void,
    howManyPosts: number,
    setHowManyPosts: Dispatch<SetStateAction<number>>,
    fromBlock: number,
    setFromBlock: Dispatch<SetStateAction<number>>,
    toBlock: number,
    setToBlock: Dispatch<SetStateAction<number>>
}) {
    return (
        <div className="p-4">
            <button className="hover:underline mb-4" onClick={showSettings}>
                {'-> Settings'}
            </button>
            {visibleSettings && (
                <div className="text-s">
                    <div className="mt-4">
                        <label className="p-2">Posts per request:</label>
                        <input className="text-right border-4 shadow-md" type="number"
                            defaultValue={howManyPosts}
                            onChange={e => setHowManyPosts(Number(e.target.value))}
                            min={1} max={100}>
                        </input>
                    </div>
                    <div className="mt-4">
                        <label className="p-2">From block:</label>
                        <input className="text-right border-4 shadow-md" type="number"
                            defaultValue={fromBlock}
                            onChange={e => setFromBlock(Number(e.target.value))}
                            min={24_402} max={1000_000_000}>
                        </input>
                    </div>
                    <div className="mt-4">
                        <label className="p-2">To block:</label>
                        <input className="text-right border-4 shadow-md" type="number"
                            defaultValue={toBlock}
                            onChange={e => setToBlock(Number(e.target.value))}
                            min={24_403} max={1000_000_000}>
                        </input>
                    </div>
                </div>
            )}
        </div>
    )
}