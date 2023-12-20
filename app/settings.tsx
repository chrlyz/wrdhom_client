import { Dispatch, SetStateAction } from "react";

export default function AppSettings({
    visibleSettings,
    showSettings,
    howManyPosts,
    setHowManyPosts,
}: {
    visibleSettings: boolean,
    showSettings: () => void,
    howManyPosts: number,
    setHowManyPosts: Dispatch<SetStateAction<number>>,
}) {
    return (
        <div className="p-4">
            <button className="hover:underline mb-4" onClick={showSettings}>
                {'-> Settings'}
            </button>
            {visibleSettings && (
                <div className="text-s">
                    <label className="p-2">Posts per request:</label>
                    <input className="text-right border-4 shadow-md" type="number"
                        defaultValue={howManyPosts}
                        onChange={e => setHowManyPosts(Number(e.target.value))}
                        min={1} max={100}>
                    </input>
                </div>
            )}
        </div>
    )
}