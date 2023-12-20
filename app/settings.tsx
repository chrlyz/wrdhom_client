import { Dispatch, SetStateAction } from "react";

export default function AppSettings({
    visibleSettings,
    showSettings,
    howManyPosts,
    setHowManyPosts,
}: {
    visibleSettings: boolean,
    showSettings: () => void,
    getPosts: boolean,
    setGetPosts: Dispatch<SetStateAction<boolean>>,
    howManyPosts: number,
    setHowManyPosts: Dispatch<SetStateAction<number>>,
}) {
    return (
        <div>
            <button className="hover:underline mb-4" onClick={showSettings}>
                {'-> Settings'}
            </button>
            {visibleSettings && (
            <div>
                <label className="p-2">Posts per request:</label>
                <input className="text-right border-4 shadow-md" type="number"
                    defaultValue={howManyPosts}
                    onChange={e => setHowManyPosts(Number(e.target.value))}
                    min={0} max={100}>
                </input>
            </div>)}
        </div>
    )
}