import { Dispatch, SetStateAction } from "react";
import { useState } from 'react';

export default function CommentsQuerySettings({
    howManyComments,
    setHowManyComments,
    commentsFromBlock,
    setCommentsFromBlock,
    commentsToBlock,
    setCommentsToBlock,
}: {
    howManyComments: number,
    setHowManyComments: Dispatch<SetStateAction<number>>,
    commentsFromBlock: number,
    setCommentsFromBlock: Dispatch<SetStateAction<number>>,
    commentsToBlock: number,
    setCommentsToBlock: Dispatch<SetStateAction<number>>,
}) {
    const [visibleCommentsSettings, setVisibleCommentsSettings] = useState(false);

    const showCommentsSettings = () => setVisibleCommentsSettings(!visibleCommentsSettings);

    return (
        <div className="m-2">
            <button className="hover:underline" onClick={showCommentsSettings}>
                {'-> Comments'}
            </button>
            {visibleCommentsSettings && (
                <div className="text-s">
                    <div className="mt-4">
                        <label className="p-2">Comments per request:</label>
                        <input className="text-right border-4 shadow-md" type="number"
                            defaultValue={howManyComments}
                            onChange={e => setHowManyComments(Number(e.target.value))}
                            min={1} max={100}>
                        </input>
                    </div>
                    <div className="mt-4">
                        <label className="p-2">From block:</label>
                        <input className="text-right border-4 shadow-md" type="number"
                            defaultValue={commentsFromBlock}
                            onChange={e => setCommentsFromBlock(Number(e.target.value))}
                            min={24_402} max={1000_000_000}>
                        </input>
                    </div>
                    <div className="mt-4">
                        <label className="p-2">To block:</label>
                        <input className="text-right border-4 shadow-md" type="number"
                            defaultValue={commentsToBlock}
                            onChange={e => setCommentsToBlock(Number(e.target.value))}
                            min={24_403} max={1000_000_000}>
                        </input>
                    </div>
                </div>
            )}
        </div>
    );
}