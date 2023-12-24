import { Dispatch, SetStateAction } from "react";
import PostsSettings from "./posts-settings";

export default function AppSettings({
    howManyPosts,
    setHowManyPosts,
    fromBlock,
    setFromBlock,
    toBlock,
    setToBlock
}: {
    howManyPosts: number,
    setHowManyPosts: Dispatch<SetStateAction<number>>,
    fromBlock: number,
    setFromBlock: Dispatch<SetStateAction<number>>,
    toBlock: number,
    setToBlock: Dispatch<SetStateAction<number>>
}) {

    return (
        <div className="mt-4 text-left">
            <label className="m-4">Settings</label>
            <PostsSettings
                howManyPosts={howManyPosts}
                setHowManyPosts={setHowManyPosts}
                fromBlock={fromBlock}
                setFromBlock={setFromBlock}
                toBlock={toBlock}
                setToBlock={setToBlock}
            />
        </div>
    );
}