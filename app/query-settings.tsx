import { Dispatch, SetStateAction } from "react";
import PostsQuerySettings from "./posts-query-settings";
import ProfileQuerySettings from './profile-query-settings';
import CommentsQuerySettings from "./comments-query-settings";
import RepostsQuerySettings from "./reposts-query-settings";

export default function QuerySettings({
    howManyPosts,
    setHowManyPosts,
    fromBlock,
    setFromBlock,
    toBlock,
    setToBlock,
    howManyPostsProfile,
    setHowManyPostsProfile,
    fromBlockProfile,
    setFromBlockProfile,
    toBlockProfile,
    setToBlockProfile,
    howManyComments,
    setHowManyComments,
    fromBlockComments,
    setFromBlockComments,
    toBlockComments,
    setToBlockComments,
    howManyReposts,
    setHowManyReposts,
    fromBlockReposts,
    setFromBlockReposts,
    toBlockReposts,
    setToBlockReposts,
}: {
    howManyPosts: number,
    setHowManyPosts: Dispatch<SetStateAction<number>>,
    fromBlock: number,
    setFromBlock: Dispatch<SetStateAction<number>>,
    toBlock: number,
    setToBlock: Dispatch<SetStateAction<number>>,
    howManyPostsProfile: number,
    setHowManyPostsProfile: Dispatch<SetStateAction<number>>,
    fromBlockProfile: number,
    setFromBlockProfile: Dispatch<SetStateAction<number>>,
    toBlockProfile: number,
    setToBlockProfile: Dispatch<SetStateAction<number>>,
    howManyComments: number,
    setHowManyComments: Dispatch<SetStateAction<number>>,
    fromBlockComments: number,
    setFromBlockComments: Dispatch<SetStateAction<number>>,
    toBlockComments: number,
    setToBlockComments: Dispatch<SetStateAction<number>>,
    howManyReposts: number,
    setHowManyReposts: Dispatch<SetStateAction<number>>,
    fromBlockReposts: number,
    setFromBlockReposts: Dispatch<SetStateAction<number>>,
    toBlockReposts: number,
    setToBlockReposts: Dispatch<SetStateAction<number>>
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
                howManyPostsProfile={howManyPostsProfile}
                setHowManyPostsProfile={setHowManyPostsProfile}
                fromBlockProfile={fromBlockProfile}
                setFromBlockProfile={setFromBlockProfile}
                toBlockProfile={toBlockProfile}
                setToBlockProfile={setToBlockProfile}
            />
            <CommentsQuerySettings
                howManyComments={howManyComments}
                setHowManyComments={setHowManyComments}
                fromBlockComments={fromBlockComments}
                setFromBlockComments={setFromBlockComments}
                toBlockComments={toBlockComments}
                setToBlockComments={setToBlockComments}
            />
            <RepostsQuerySettings
                howManyReposts={howManyReposts}
                setHowManyReposts={setHowManyReposts}
                fromBlockReposts={fromBlockReposts}
                setFromBlockReposts={setFromBlockReposts}
                toBlockReposts={toBlockReposts}
                setToBlockReposts={setToBlockReposts}
            />
        </div>
    );
}