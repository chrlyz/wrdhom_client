import { Dispatch, SetStateAction } from "react";
import PostsQuerySettings from "./posts-query-settings";
import ProfileQuerySettings from './profile-query-settings';
import CommentsQuerySettings from "./comments-query-settings";

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
    profileSetToBlock,
    howManyComments,
    setHowManyComments,
    commentsFromBlock,
    setCommentsFromBlock,
    commentsToBlock,
    setCommentsToBlock,
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
    profileSetToBlock: Dispatch<SetStateAction<number>>,
    howManyComments: number,
    setHowManyComments: Dispatch<SetStateAction<number>>,
    commentsFromBlock: number,
    setCommentsFromBlock: Dispatch<SetStateAction<number>>,
    commentsToBlock: number,
    setCommentsToBlock: Dispatch<SetStateAction<number>>,
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
            <CommentsQuerySettings
                howManyComments={howManyComments}
                setHowManyComments={setHowManyComments}
                commentsFromBlock={commentsFromBlock}
                setCommentsFromBlock={setCommentsFromBlock}
                commentsToBlock={commentsToBlock}
                setCommentsToBlock={setCommentsToBlock}
            />
        </div>
    );
}