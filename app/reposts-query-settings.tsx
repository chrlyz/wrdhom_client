import { Dispatch, SetStateAction } from "react";
import { useState } from 'react';

export default function RepostsQuerySettings({
    howManyReposts,
    setHowManyReposts,
    fromBlockReposts,
    setFromBlockReposts,
    toBlockReposts,
    setToBlockReposts
}: {
    howManyReposts: number,
    setHowManyReposts: Dispatch<SetStateAction<number>>,
    fromBlockReposts: number,
    setFromBlockReposts: Dispatch<SetStateAction<number>>,
    toBlockReposts: number,
    setToBlockReposts: Dispatch<SetStateAction<number>>
}) {
    const [visibleRepostsSettings, setVisibleRepostsSettings] = useState(false);

    const showRepostsSettings = () => setVisibleRepostsSettings(!visibleRepostsSettings);

    return (
        <div className="m-2">
            <button className="hover:underline" onClick={showRepostsSettings}>
                {'-> Reposts'}
            </button>
            {visibleRepostsSettings && (
                <div className="text-s">
                    <div className="mt-4">
                        <label className="p-2">Reposts per request:</label>
                        <input className="text-right border-4 shadow-md" type="number"
                            defaultValue={howManyReposts}
                            onChange={e => setHowManyReposts(Number(e.target.value))}
                            min={0} max={100}>
                        </input>
                    </div>
                    <div className="mt-4">
                        <label className="p-2">From block:</label>
                        <input className="text-right border-4 shadow-md" type="number"
                            defaultValue={fromBlockReposts}
                            onChange={e => setFromBlockReposts(Number(e.target.value))}
                            min={24_402} max={1000_000_000}>
                        </input>
                    </div>
                    <div className="mt-4">
                        <label className="p-2">To block:</label>
                        <input className="text-right border-4 shadow-md" type="number"
                            defaultValue={toBlockReposts}
                            onChange={e => setToBlockReposts(Number(e.target.value))}
                            min={24_403} max={1000_000_000}>
                        </input>
                    </div>
                </div>
            )}
        </div>
    );
}