import React from 'react';
import { Dispatch, SetStateAction } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments, faRetweet } from '@fortawesome/free-solid-svg-icons';
import ReactionButton from '../reactions/reaction-button';
import CommentButton from '../comments/comment-button';
import DeletePostButton from '../posts/delete-post-button';
import DeleteRepostButton from '../reposts/delete-repost-button';
import RepostButton from '../reposts/repost-button';
import { FeedType } from '../types';

const ContentItem = ({
    feedType,
    item,
    walletConnected,
    account,
    setSelectedProfileAddress,
    selectedProfileAddress,
    setProfileAddress,
    setCommentTarget
}: {
    feedType: FeedType,
    item: any,
    walletConnected: boolean,
    account: string[],
    setSelectedProfileAddress: Dispatch<SetStateAction<string>>,
    selectedProfileAddress: string,
    setProfileAddress: Dispatch<SetStateAction<string>>,
    setCommentTarget: Dispatch<SetStateAction<any>>
}) => {
  const isRepost = item.repostState !== undefined;
  const isCurrentUserRepost = item.currentUserRepostState !== undefined;
  const isCurrentUserPost = account[0] === item.postState.posterAddress;

  const renderRepostInfo = () => {
    if (!isRepost) return null;
    return (
      <div className="flex flex-row">
        <div
          className="text-xs text-stone-400 mt-1"
          onMouseEnter={() => setSelectedProfileAddress(item.repostState.reposterAddress)}
          onClick={() => setProfileAddress(selectedProfileAddress)}
        >
          <span className="cursor-pointer hover:underline">{item.shortReposterAddressEnd}</span>
          {` reposted at block ${item.repostState.repostBlockHeight} `}
          {
            feedType === 'global' ? `(Repost: ${item.repostState.allRepostsCounter})`
            : `(User Repost: ${item.repostState.userRepostsCounter})` 
          }
        </div>
      </div>
    );
  };

  const renderPostHeader = () => (
    <div className="flex items-center border-4 p-2 shadow-lg text-xs text-white bg-black">
      <span
        className="mr-2 cursor-pointer hover:underline"
        onMouseEnter={() => setSelectedProfileAddress(item.postState.posterAddress)}
        onClick={() => setProfileAddress(selectedProfileAddress)}
      >
        <p className="mr-8">{item.shortPosterAddressEnd}</p>
      </span>
      <p className="mr-4">
        {
          feedType === 'global' ? 'Post:' + item.postState.allPostsCounter
          : 'User Post:' + item.postState.userPostsCounter
        }
      </p>
      <div className="flex-grow"></div>
      <p className="mr-1">{'Block:' + item.postState.postBlockHeight}</p>
    </div>
  );

  const renderPostContent = () => (
    <div className="flex items-center border-4 p-2 shadow-lg whitespace-pre-wrap break-normal overflow-wrap">
      <p>{item.content}</p>
    </div>
  );

  const renderPostFooter = () => (
    <div className="flex flex-row">
      {item.top3Emojis.map((emoji: string) => <span key={emoji}>{emoji}</span>)}
      <p className="text-xs ml-1 mt-2">{item.filteredEmbeddedReactions.length > 0 ? item.filteredEmbeddedReactions.length : null}</p>
      {renderCommentButton()}
      {renderRepostIcon()}
      <div className="flex-grow"></div>
      {renderActionButtons()}
    </div>
  );

  const renderCommentButton = () => {
    if (item.numberOfNonDeletedComments <= 0) return null;
    return (
      <>
        <button className="hover:text-lg ml-3" onClick={() => setCommentTarget(item)}>
          <FontAwesomeIcon icon={faComments} />
        </button>
        <p className="text-xs ml-1 mt-2">{item.numberOfNonDeletedComments}</p>
      </>
    );
  };

  const renderRepostIcon = () => {
    if (item.numberOfNonDeletedReposts <= 0) return null;
    return (
      <>
        <div className="ml-3"><FontAwesomeIcon icon={faRetweet} /></div>
        <p className="text-xs ml-1 mt-2">{item.numberOfNonDeletedReposts}</p>
      </>
    );
  };

  const renderActionButtons = () => {
    if (!walletConnected) return null;
    return (
      <>
        <ReactionButton
          targetKey={item.postKey}
          embeddedReactions={item.filteredEmbeddedReactions}
          account={account[0]}
        />
        <CommentButton targetKey={item.postKey} />
        {renderRepostOrDeleteButton()}
        {isCurrentUserPost && (
          <DeletePostButton
            postState={item.postState}
            postKey={item.postKey}
          />
        )}
      </>
    );
  };

  const renderRepostOrDeleteButton = () => {
    if (isRepost && account[0] === item.repostState.reposterAddress) {
      return (
        <DeleteRepostButton
          repostTargetKey={item.postKey}
          repostState={item.repostState}
          repostKey={item.repostKey}
        />
      );
    } else if (isCurrentUserRepost && account[0] === item.currentUserRepostState.reposterAddress) {
      return (
        <DeleteRepostButton
          repostTargetKey={item.postKey}
          repostState={item.currentUserRepostState}
          repostKey={item.currentUserRepostKey}
        />
      );
    } else {
      return <RepostButton targetKey={item.postKey} />;
    }
  };

  return (
    <div key={item.repostKey === undefined ? item.postKey : item.repostKey} className="p-2 border-b-2 shadow-lg">
      {renderRepostInfo()}
      {renderPostHeader()}
      {renderPostContent()}
      {renderPostFooter()}
    </div>
  );
};

const ItemContentList = ({
    feedType,
    mergedContent,
    loading,
    walletConnected,
    account,
    setSelectedProfileAddress,
    selectedProfileAddress,
    setProfileAddress,
    setCommentTarget
}: {
    feedType: FeedType,
    mergedContent: any[],
    loading: boolean,
    walletConnected: boolean,
    account: string[],
    setSelectedProfileAddress: Dispatch<SetStateAction<string>>,
    selectedProfileAddress: string,
    setProfileAddress: Dispatch<SetStateAction<string>>,
    setCommentTarget: Dispatch<SetStateAction<any>>
}) => {
  if (loading || !Array.isArray(mergedContent)) return null;

  return mergedContent.map((item) => (
    <ContentItem
      feedType={feedType}
      key={item.repostKey === undefined ? item.postKey : item.repostKey}
      item={item}
      walletConnected={walletConnected}
      account={account}
      setSelectedProfileAddress={setSelectedProfileAddress}
      selectedProfileAddress={selectedProfileAddress}
      setProfileAddress={setProfileAddress}
      setCommentTarget={setCommentTarget}
    />
  ));
};

export default ItemContentList;