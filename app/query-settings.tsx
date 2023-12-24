import { Dispatch, SetStateAction } from "react";
import PostsQuerySettings from "./posts-query-settings";
import ProfileQuerySettings from './profile-query-settings';

export default function QuerySettings({
    howManyPosts,
    setHowManyPosts,
    fromBlock,
    setFromBlock,
    toBlock,
    setToBlock,
    profileHowManyPosts,
    profileSetHowManyPosts,
    profileFromBlock,
    profileSetFromBlock,
    profileToBlock,
    profileSetToBlock
}: {
    howManyPosts: number,
    setHowManyPosts: Dispatch<SetStateAction<number>>,
    fromBlock: number,
    setFromBlock: Dispatch<SetStateAction<number>>,
    toBlock: number,
    setToBlock: Dispatch<SetStateAction<number>>,
    profileHowManyPosts: number,
    profileSetHowManyPosts: Dispatch<SetStateAction<number>>,
    profileFromBlock: number,
    profileSetFromBlock: Dispatch<SetStateAction<number>>,
    profileToBlock: number,
    profileSetToBlock: Dispatch<SetStateAction<number>>
}) {

    return (
        <div className="mt-4 text-left">
            <label className="m-4">Settings</label>
            <PostsQuerySettings
                howManyPosts={howManyPosts}
                setHowManyPosts={setHowManyPosts}
                fromBlock={fromBlock}
                setFromBlock={setFromBlock}
                toBlock={toBlock}
                setToBlock={setToBlock}
            />
            <ProfileQuerySettings
                profileHowManyPosts={profileHowManyPosts}
                profileSetHowManyPosts={profileSetHowManyPosts}
                profileFromBlock={profileFromBlock}
                profileSetFromBlock={profileSetFromBlock}
                profileToBlock={profileToBlock}
                profileSetToBlock={profileSetToBlock}
            />
        </div>
    );
}