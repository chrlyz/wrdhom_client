import { Dispatch, SetStateAction } from "react";
import PostsQuerySettings from "../posts/posts-query-settings";
import CommentsQuerySettings from "../comments/comments-query-settings";
import RequerySettings from "../reposts/reposts-query-settings";

export default function QuerySettings({
    howManyPosts,
    setHowManyPosts,
    fromBlock,
    setFromBlock,
    toBlock,
    setToBlock,
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
            <CommentsQuerySettings
                howManyComments={howManyComments}
                setHowManyComments={setHowManyComments}
                fromBlockComments={fromBlockComments}
                setFromBlockComments={setFromBlockComments}
                toBlockComments={toBlockComments}
                setToBlockComments={setToBlockComments}
            />
            <RequerySettings
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