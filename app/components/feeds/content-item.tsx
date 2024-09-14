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
import DeleteCommentButton from '../comments/delete-comment-button';

export const ContentItem = ({
    feedType,
    item,
    walletConnected,
    account,
    setSelectedProfileAddress,
    selectedProfileAddress,
    setProfileAddress,
    setCommentTarget,
    commentTarget
}: {
    feedType: FeedType,
    item: any,
    walletConnected: boolean,
    account: string[],
    setSelectedProfileAddress: Dispatch<SetStateAction<string>>,
    selectedProfileAddress: string,
    setProfileAddress: Dispatch<SetStateAction<string>>,
    setCommentTarget: Dispatch<SetStateAction<any>>,
    commentTarget?: any
}) => {
  const isRepost = item.repostState !== undefined;
  const isComment = item.commentState !== undefined;
  const isCurrentUserRepost = item.currentUserRepostState !== undefined;

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

  const renderHeader = (isComment: boolean) => {
    const state = isComment ? item.commentState : item.postState;
    const addressType = isComment ? 'commenter' : 'poster';
    const itemType = isComment ? 'Comment' : 'Post';
  
    return (
      <div className="flex items-center border-4 p-2 shadow-lg text-xs text-white bg-black">
        <span
          className="mr-2 cursor-pointer hover:underline"
          onMouseEnter={() => setSelectedProfileAddress(state[`${addressType}Address`])}
          onClick={() => setProfileAddress(selectedProfileAddress)}
        >
          <p className="mr-8">{item[`short${addressType.charAt(0).toUpperCase() + addressType.slice(1)}AddressEnd`]}</p>
        </span>
        <p className="mr-4">
          {
            feedType === 'global' 
              ? `${itemType}: ${isComment ? state.allCommentsCounter : state.allPostsCounter}`
              : `User ${itemType}: ${isComment ? state.userCommentsCounter : state.userPostsCounter}`
          }
        </p>
        <div className="flex-grow"></div>
        <p className="mr-1">{`Block: ${state[`${itemType.toLowerCase()}BlockHeight`]}`}</p>
      </div>
    );
  };

  const renderContent = () => (
    <div className="flex items-center border-4 p-2 shadow-lg whitespace-pre-wrap break-normal overflow-wrap">
      <p>{item.content}</p>
    </div>
  );

  const renderFooter = (isComment: boolean) => {
    if (!isComment) {
      return (
        <div className="flex flex-row">
          {item.top3Emojis.map((emoji: string) => <span key={emoji}>{emoji}</span>)}
          <p className="text-xs ml-1 mt-2">{item.filteredEmbeddedReactions.length > 0 ? item.filteredEmbeddedReactions.length : null}</p>
          {renderCommentButton()}
          {renderRepostIcon()}
          <div className="flex-grow"></div>
          {renderActionButtons(isComment)}
        </div>
      );
    } else {
      return (
        <div className="flex flex-row">
          <div className="flex-grow"></div>
          {renderActionButtons(isComment)}
        </div>
      );
    }
  };

  const renderCommentButton = () => {
    if (item.numberOfNonDeletedComments === 0) return null;
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
    if (item.numberOfNonDeletedReposts === 0) return null;
    return (
      <>
        <div className="ml-3"><FontAwesomeIcon icon={faRetweet} /></div>
        <p className="text-xs ml-1 mt-2">{item.numberOfNonDeletedReposts}</p>
      </>
    );
  };

  const renderActionButtons = (isComment: boolean) => {
    if (!walletConnected) return null;
    if (!isComment) {
      return (
        <>
          <ReactionButton
            targetKey={item.postKey}
            embeddedReactions={item.filteredEmbeddedReactions}
            account={account[0]}
          />
          <CommentButton targetKey={item.postKey} />
          {renderRepostOrDeleteButton()}
          {account[0] === item.postState.posterAddress && (
            <DeletePostButton
              postState={item.postState}
              postKey={item.postKey}
            />
          )}
        </>
      );
    } else {
      return (
        <>
          {account[0] === item.commentState.commenterAddress ?
            <DeleteCommentButton
              commentTarget={commentTarget}
              commentState={item.commentState}
              commentKey={item.commentKey}  
            />
          : null}
        </>
      );
    }
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
    <div className="p-2 border-b-2 shadow-lg">
      {renderRepostInfo()}
      {renderHeader(isComment)}
      {renderContent()}
      {renderFooter(isComment)}
    </div>
  );
};

export const ItemContentList = ({
    feedType,
    mergedContent,
    loading,
    walletConnected,
    account,
    setSelectedProfileAddress,
    selectedProfileAddress,
    setProfileAddress,
    setCommentTarget,
    commentTarget
}: {
    feedType: FeedType,
    mergedContent: any[],
    loading: boolean,
    walletConnected: boolean,
    account: string[],
    setSelectedProfileAddress: Dispatch<SetStateAction<string>>,
    selectedProfileAddress: string,
    setProfileAddress: Dispatch<SetStateAction<string>>,
    setCommentTarget: Dispatch<SetStateAction<any>>,
    commentTarget?: any
}) => {
  if (loading || !Array.isArray(mergedContent)) return null;

  return mergedContent.map((item) => (
    <ContentItem
      feedType={feedType}
      key={
        item.commentKey !== undefined
        ? item.commentKey
        : item.repostKey === undefined
        ? item.postKey
        : item.repostKey
      }
      item={item}
      walletConnected={walletConnected}
      account={account}
      setSelectedProfileAddress={setSelectedProfileAddress}
      selectedProfileAddress={selectedProfileAddress}
      setProfileAddress={setProfileAddress}
      setCommentTarget={setCommentTarget}
      commentTarget={commentTarget}
    />
  ));
};