import { useState, useEffect } from 'react';
import { Dispatch, SetStateAction } from "react";
import { getCID } from './utils/cid';
import ReactionButton from './reaction-button';
import CommentButton from './comment-button';
import { faComments, faRetweet } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import RepostButton from './repost-button';
import { ProcessedReactions, ProcessedPosts, ProcessedReposts } from './get-posts';

export default function GetProfile({
  getProfile,
  profileAddress,
  setProfileAddress,
  howManyPostsProfile,
  fromBlockProfile,
  toBlockProfile,
  setShowProfile,
  setHideGetPosts,
  walletConnected,
  setCommentTarget,
  howManyReposts,
  fromBlockReposts,
  toBlockReposts,
}: {
  getProfile: boolean,
  profileAddress: string,
  setProfileAddress: Dispatch<SetStateAction<string>>,
  howManyPostsProfile: number,
  fromBlockProfile: number,
  toBlockProfile: number,
  setShowProfile: Dispatch<SetStateAction<boolean>>,
  setHideGetPosts: Dispatch<SetStateAction<string>>,
  walletConnected: boolean,
  setCommentTarget: Dispatch<SetStateAction<any>>,
  howManyReposts: number,
  fromBlockReposts: number,
  toBlockReposts: number,
}) {
  const [posts, setPosts] = useState([] as any[]);
  const [reposts, setReposts] = useState([] as any[]);
  const [selectedProfileAddress, setSelectedProfileAddress] = useState('');
  const [mergedContent, setMergedContent] = useState([] as any);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [warningMessage, setWarningMessage] = useState(null);
  const [triggerAudit, setTriggerAudit] = useState(false);
  const [ready, setReady] = useState(false);
  const [whenZeroContent, setWhenZeroContent] = useState(false);

  const fetchPosts = async () => {
    try {
      setPosts([]);
      setReposts([]);
      setLoading(true);
      setErrorMessage(null);
      setWarningMessage(null);
      setWhenZeroContent(false);
      const response = await fetch(`/posts`+
      `?posterAddress=${profileAddress}`+
      `&howMany=${howManyPostsProfile}`+
      `&fromBlock=${fromBlockProfile}`+
      `&toBlock=${toBlockProfile}`,
        {
          headers: {'Cache-Control': 'no-cache'}
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: any[] = await response.json();
      // Audit numbe of posts query
      if (data.length !== howManyPostsProfile) {
        setWarningMessage(`Expected ${howManyPostsProfile} posts, but got ${data.length}. This could be because there are not\
        as many posts that match your query, but the server could also be censoring posts.` as any);
      }
      if (data.length === 0) {
        return;
      }
      const { MerkleMapWitness, fetchAccount } = await import('o1js');
      const { PostState, ReactionState } = await import('wrdhom');
      const postsContractData = await fetchAccount({
        publicKey: 'B62qkWodZBcAAMtw6Q8bG37CYRgKjurS84tdhacLmSmnu3P719eUydF'
      }, '/graphql');
      const fetchedPostsRoot = postsContractData.account?.zkapp?.appState[2].toString();
      console.log('fetchedPostsRoot: ' + fetchedPostsRoot);
      const reactionsContractData = await fetchAccount({
        publicKey: 'B62qoiVJBGMS3zip5QDUVvCtK2ENPsg2GGyjaqMFV8fN6H265GoiomY'
      }, '/graphql');
      const fetchedReactionsRoot = reactionsContractData.account?.zkapp?.appState[3].toString();
      console.log('fetchedReactionsRoot: ' + fetchedReactionsRoot);

      // Remove post to cause a gap error
      //data.splice(2, 1);

      // Remove reaction to cause a gap error
      // data[2].reactionsResponse.splice(4, 1);

      const processedPosts: ProcessedPosts[] = [];
      for (let i = 0; i < data.length; i++) {
        const postStateJSON = JSON.parse(data[i].postState);
        const shortPosterAddressEnd = postStateJSON.posterAddress.slice(-12);
        const postWitness = MerkleMapWitness.fromJSON(data[i].postWitness);
        const postState = PostState.fromJSON(postStateJSON);
        let calculatedPostsRoot = postWitness.computeRootAndKey(postState.hash())[0].toString();
        console.log('calculatedPostsRoot: ' + calculatedPostsRoot);
        const processedReactions: ProcessedReactions = [];

        // Introduce different root to cause a root mismatch
        /*if (index === 0) {
          calculatedPostsRoot = 'badRoot'
        }*/

        // Introduce different block-length to cause block mismatch
        /*if (index === 2) {
          postStateJSON.postBlockHeight = 10000000000;
        }*/

        // Introduce different content to cause content mismatch
        /*if (i === 0) {
          data[i].content = 'wrong content';
        }*/

        // Audit that all posts come from the profile we are visiting
        if (profileAddress !== postStateJSON.posterAddress) {
          throw new Error(`User Post ${postStateJSON.userPostsCounter} comes from a wrong address. All posts should come from address: ${profileAddress}`);
        }

        // Audit that all posts are between the block range in the user query
        if (postStateJSON.postBlockHeight < fromBlockProfile ||  postStateJSON.postBlockHeight > toBlockProfile) {
          throw new Error(`Block-length ${postStateJSON.postBlockHeight} for User Post ${postStateJSON.userPostsCounter} isn't between the block range\
          ${fromBlockProfile} to ${toBlockProfile}`);
        }

        // Audit that all roots calculated from the state of each post and their witnesses, match zkApp state
        if (fetchedPostsRoot !== calculatedPostsRoot) {
          throw new Error(`USer Post ${postStateJSON.userPostsCounter} has different root than zkApp state. The server may be experiencing some issues or\
          manipulating results for your query.`);
        }

        // Audit that the content of posts matches the contentID signed by the author
        const cid = await getCID(data[i].content);
        if (cid !== data[i].postContentID) {
          throw new Error(`The content for User Post ${postStateJSON.userPostsCounter} doesn't match the expected contentID. The server may be experiencing\
          some issues or manipulating the content it shows.`);
        }

        for (let r = 0; r < data[i].reactionsResponse.length; r++) {
          const reactionStateJSON = JSON.parse(data[i].reactionsResponse[r].reactionState);
          const reactionWitness = MerkleMapWitness.fromJSON(data[i].reactionsResponse[r].reactionWitness);
          const reactionState = ReactionState.fromJSON(reactionStateJSON);
          let calculatedReactionRoot = reactionWitness.computeRootAndKey(reactionState.hash())[0].toString();
          console.log('calculatedReactionRoot: ' + calculatedReactionRoot);

          // Audit that all roots calculated from the state of each reaction and their witnesses, match zkApp state
          if (fetchedReactionsRoot !== calculatedReactionRoot) {
            throw new Error(`Reaction ${reactionStateJSON.allReactionsCounter} has different root than zkApp state.\
            The server may be experiencing some issues or manipulating results for the reactions to User Post ${postStateJSON.userPostsCounter}.`);
          }

          processedReactions.push({
            reactionState: reactionStateJSON,
            reactionEmoji: String.fromCodePoint(reactionStateJSON.reactionCodePoint),
            reactionsRoot: calculatedReactionRoot
          });
        }

        const emojis = processedReactions.map(reaction => reaction.reactionEmoji);
        const frequencyMap = new Map<string, number>();
        emojis.forEach(emoji => {
          const count = frequencyMap.get(emoji) || 0;
          frequencyMap.set(emoji, count + 1);
        });
        const sortedEmojis = Array.from(frequencyMap).sort((a, b) => b[1] - a[1]);
        const top3Emojis = sortedEmojis.slice(0, 3).map(item => item[0]);

        processedPosts.push({
            postState: postStateJSON,
            postKey: data[i].postKey,
            postContentID: data[i].postContentID,
            content: data[i].content,
            shortPosterAddressEnd: shortPosterAddressEnd,
            postsRoot: calculatedPostsRoot,
            processedReactions: processedReactions,
            top3Emojis: top3Emojis,
            numberOfComments: data[i].numberOfComments,
            numberOfReposts: data[i].numberOfReposts
        });
      };

      setPosts(processedPosts);
    } catch (e: any) {
        setLoading(false);
        setErrorMessage(e.message);
    }
  };

  const fetchReposts = async () => {
    try {
      const response = await fetch(`/reposts`+
        `?reposterAddress=${profileAddress}`+
        `&howMany=${howManyReposts}`+
        `&fromBlock=${fromBlockReposts}`+
        `&toBlock=${toBlockReposts}`,
        {
          headers: {'Cache-Control': 'no-cache'}
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: any[] = await response.json();
      // Audit number of reposts query
      if (data.length !== howManyReposts) {
        setWarningMessage(`Expected ${howManyReposts} reposts, but got ${data.length}. This could be because there are not\
        as many reposts that match your query, but the server could also be censoring reposts.` as any);
      }
      if (data.length === 0) {
        return;
      }
      const { MerkleMapWitness, fetchAccount } = await import('o1js');
      const { PostState, ReactionState, RepostState } = await import('wrdhom');
      const postsContractData = await fetchAccount({
        publicKey: 'B62qkWodZBcAAMtw6Q8bG37CYRgKjurS84tdhacLmSmnu3P719eUydF'
      }, '/graphql');
      const fetchedPostsRoot = postsContractData.account?.zkapp?.appState[2].toString();
      console.log('fetchedPostsRoot: ' + fetchedPostsRoot);
      const reactionsContractData = await fetchAccount({
        publicKey: 'B62qoiVJBGMS3zip5QDUVvCtK2ENPsg2GGyjaqMFV8fN6H265GoiomY'
      }, '/graphql');
      const fetchedReactionsRoot = reactionsContractData.account?.zkapp?.appState[3].toString();
      console.log('fetchedReactionsRoot: ' + fetchedReactionsRoot);
      const repostsContractData = await fetchAccount({
        publicKey: 'B62qppUERZTvay1Na4TdA7M5p2V3Nz2dbBYvj6NPhsKk2WLHYpfkQfA'
      }, '/graphql');
      const fetchedRepostsRoot = repostsContractData.account?.zkapp?.appState[3].toString();
      console.log('fetchedRepostsRoot: ' + fetchedRepostsRoot);

      // Remove repost to cause a gap error
      //data.splice(2, 1);

      // Remove reaction to cause a gap error
      // data[2].reactionsResponse.splice(4, 1);

      const processedReposts: ProcessedReposts[] = [];
      for (let i = 0; i < data.length; i++) {
        const repostStateJSON = JSON.parse(data[i].repostState);
        const postStateJSON = JSON.parse(data[i].postState);
        const shortReposterAddressEnd = repostStateJSON.reposterAddress.slice(-12);
        const shortPosterAddressEnd = postStateJSON.posterAddress.slice(-12);
        const repostWitness = MerkleMapWitness.fromJSON(data[i].repostWitness);
        const postWitness = MerkleMapWitness.fromJSON(data[i].postWitness);
        const repostState = RepostState.fromJSON(repostStateJSON);
        const postState = PostState.fromJSON(postStateJSON);
        let calculatedRepostsRoot = repostWitness.computeRootAndKey(repostState.hash())[0].toString();
        let calculatedPostsRoot = postWitness.computeRootAndKey(postState.hash())[0].toString();
        console.log('calculatedRepostsRoot: ' + calculatedRepostsRoot);
        console.log('calculatedPostsRoot: ' + calculatedPostsRoot);
        const processedReactions: ProcessedReactions = [];

        // Introduce different root to cause a root mismatch
        /*if (index === 0) {
          calculatedRepostsRoot = 'badRoot'
        }*/

        // Introduce different block-length to cause block mismatch
        /*if (index === 2) {
          repostStateJSON.repostBlockHeight = 10000000000;
        }*/

        // Introduce different content to cause content mismatch
        /*if (i === 0) {
          data[i].content = 'wrong content';
        }*/

        // Audit that all reposts come from the profile we are visiting
        if (profileAddress !== repostStateJSON.reposterAddress) {
          throw new Error(`User Repost ${repostStateJSON.userRepostsCounter} comes from the wrong address: ${repostStateJSON.reposterAddress}. All posts should come from address: ${profileAddress}`);
        }

        // Audit that all reposts are between the block range in the user query
        if (repostStateJSON.repostBlockHeight < fromBlockReposts ||  repostStateJSON.repostBlockHeight > toBlockReposts) {
          throw new Error(`Block-length ${repostStateJSON.repostBlockHeight} for Repost ${repostStateJSON.userRepostsCounter} isn't between the block range\
          ${fromBlockReposts} to ${toBlockReposts}`);
        }

        // Audit that all roots calculated from the state of each repost and their witnesses, match zkApp state
        if (fetchedRepostsRoot !== calculatedRepostsRoot) {
          throw new Error(`User Repost ${repostStateJSON.userRepostsCounter} has different root than zkApp state. The server may be experiencing some issues or\
          manipulating results for your query.`);
        }    

        // Audit that all roots calculated from the state of each post and their witnesses, match zkApp state
        if (fetchedPostsRoot !== calculatedPostsRoot) {
          throw new Error(`Post with allPostsCounter ${repostStateJSON.userRepostsCounter} from User Repost ${repostStateJSON.userRepostsCounter} has different\
         root than zkApp state. The server may be experiencing some issues or manipulating results for your query.`);
        }

        // Audit that the content of the reposted posts matches the contentID signed by the post author
        const cid = await getCID(data[i].content);
        if (cid !== data[i].postContentID) {
          throw new Error(`The content for Post with allPostsCounter ${postStateJSON.allPostsCounter} from User Repost ${repostStateJSON.userRepostsCounter}\
          doesn't match the expected contentID. The server may be experiencing some issues or manipulating the content it shows.`);
        }

        for (let r = 0; r < data[i].reactionsResponse.length; r++) {
          const reactionStateJSON = JSON.parse(data[i].reactionsResponse[r].reactionState);
          const reactionWitness = MerkleMapWitness.fromJSON(data[i].reactionsResponse[r].reactionWitness);
          const reactionState = ReactionState.fromJSON(reactionStateJSON);
          let calculatedReactionRoot = reactionWitness.computeRootAndKey(reactionState.hash())[0].toString();
          console.log('calculatedReactionRoot: ' + calculatedReactionRoot);

          // Audit that all roots calculated from the state of each reaction and their witnesses, match zkApp state
          if (fetchedReactionsRoot !== calculatedReactionRoot) {
            throw new Error(`Reaction ${reactionStateJSON.allReactionsCounter} has different root than zkApp state. The server may be experiencing some issues\
            or manipulating results for the reactions to Post with allPostsCounter ${postStateJSON.allPostsCounter} from User Repost\
            ${repostStateJSON.userRepostsCounter}`);
          }

          processedReactions.push({
            reactionState: reactionStateJSON,
            reactionEmoji: String.fromCodePoint(reactionStateJSON.reactionCodePoint),
            reactionsRoot: calculatedReactionRoot
          });
        }

        const emojis = processedReactions.map(reaction => reaction.reactionEmoji);
        const frequencyMap = new Map<string, number>();
        emojis.forEach(emoji => {
          const count = frequencyMap.get(emoji) || 0;
          frequencyMap.set(emoji, count + 1);
        });
        const sortedEmojis = Array.from(frequencyMap).sort((a, b) => b[1] - a[1]);
        const top3Emojis = sortedEmojis.slice(0, 3).map(item => item[0]);

        processedReposts.push({
            repostState: repostStateJSON,
            repostKey: data[i].repostKey,
            shortReposterAddressEnd: shortReposterAddressEnd,
            postState: postStateJSON,
            postKey: data[i].postKey,
            postContentID: data[i].postContentID,
            content: data[i].content,
            shortPosterAddressEnd: shortPosterAddressEnd,
            postsRoot: calculatedPostsRoot,
            processedReactions: processedReactions,
            top3Emojis: top3Emojis,
            numberOfComments: data[i].numberOfComments,
            numberOfReposts: data[i].numberOfReposts
        });
      };

      setReposts(processedReposts);
    } catch (e: any) {
        setLoading(false);
        setErrorMessage(e.message);
    }
  };

  const auditNoMissingPosts = () => {
    try {
      for (let i = 0; i < posts.length-1; i++) {
        if (Number(posts[i].postState.userPostsCounter) !== Number(posts[i+1].postState.userPostsCounter)+1) {
          throw new Error(`Gap between User Posts ${posts[i].postState.userPostsCounter} and ${posts[i+1].postState.userPostsCounter}.\
          The server may be experiencing some issues or censoring posts.`);
        }

        for (let r = 0; r < Number(posts[i].processedReactions.length)-1; r++) {
          if (Number(posts[i].processedReactions[r].reactionState.targetReactionsCounter)
          !== Number(posts[i].processedReactions[r+1].reactionState.targetReactionsCounter)+1) {
            throw new Error(`Gap between Reactions ${posts[i].processedReactions[r].reactionState.targetReactionsCounter} and\
            ${posts[i].processedReactions[r+1].reactionState.targetReactionsCounter}, from User Post ${posts[i].postState.userPostsCounter}\
            The server may be experiencing some issues or censoring posts.`);
          }
        }
      }
    } catch (e: any) {
        setLoading(false);
        setErrorMessage(e.message);
    }
  }

  const auditNoMissingReposts = () => {
    try {
      for (let i = 0; i < reposts.length-1; i++) {
        if (Number(reposts[i].repostState.userRepostsCounter) !== Number(reposts[i+1].repostState.userRepostsCounter)+1) {
          throw new Error(`Gap between User Reposts ${reposts[i].repostState.userRepostsCounter} and ${reposts[i+1].repostState.userRepostsCounter}.\
          The server may be experiencing some issues or censoring reposts.`);
        }

        for (let r = 0; r < Number(reposts[i].processedReactions.length)-1; r++) {
          if (Number(reposts[i].processedReactions[r].reactionState.targetReactionsCounter)
          !== Number(reposts[i].processedReactions[r+1].reactionState.targetReactionsCounter)+1) {
            throw new Error(`Gap between Reactions ${reposts[i].processedReactions[r].reactionState.targetReactionsCounter} and\
            ${reposts[i].processedReactions[r+1].reactionState.targetReactionsCounter} from User Repost ${reposts[i].repostState.userRepostsCounter}\
            The server may be experiencing some issues or censoring posts.`);
          }
        }
      }
    } catch (e: any) {
        setErrorMessage(e.message);
    }
  }


  const goBack = () => {
    setShowProfile(false);
    setProfileAddress('');
    setCommentTarget(null);
    setHideGetPosts('');
  }

  const mergeAndSortContent = () => {
    const merged = [...posts, ...reposts];
    const sortedAndMerged = merged.sort((a,b) => {
        const blockHeightA =  a.repostState === undefined ? a.postState.postBlockHeight : a.repostState.repostBlockHeight;
        const blockHeightB =  b.repostState === undefined ? b.postState.postBlockHeight : b.repostState.repostBlockHeight;
        return blockHeightB - blockHeightA;
    });
    setMergedContent(sortedAndMerged);
    if (sortedAndMerged.length === 0 && ready !== false) {
      setWhenZeroContent(true);
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      await fetchPosts();
      await fetchReposts();
      setTriggerAudit(!triggerAudit);
    })();
  }, [getProfile, profileAddress]);

  useEffect(() => {
    auditNoMissingPosts();
    auditNoMissingReposts();
    mergeAndSortContent();
    setReady(!ready);
  }, [triggerAudit]);

  useEffect(() => {
    if (mergedContent.length > 0) {
      setLoading(false);
    }
  }, [ready]);

  return (
    <div className={`w-3/5 p-4 overflow-y-auto max-h-[100vh]`}>
      <div className="p-2 border-b-2 shadow-lg">
        <button className="hover:underline m-2" onClick={goBack}>{'<- Go back to feed'}</button>
        <div className="flex items-center border-4 p-2 shadow-lg whitespace-pre-wrap break-all">
            <p >{`Posts from user:\n\n${profileAddress}`}</p>
        </div>
      </div>
      {loading && <p className="border-4 p-2 shadow-lg">Loading...</p>}
      {errorMessage && <p className="border-4 p-2 shadow-lg">Error: {errorMessage}</p>}
      {!loading && warningMessage && <p className="border-4 p-2 shadow-lg">Warning: {warningMessage}</p>}
      {!loading && !errorMessage && Array.isArray(mergedContent) && mergedContent.map((post) => {
        return (
            <div key={post.repostKey === undefined ? post.postKey : post.repostKey} className="p-2 border-b-2 shadow-lg">
                {post.repostState === undefined ? null :
                  <div
                    className="text-xs text-stone-400"
                    onMouseEnter={() => setSelectedProfileAddress(post.repostState.reposterAddress)}
                    onClick={() => setProfileAddress(selectedProfileAddress)}
                  >
                  <span className="cursor-pointer hover:underline">{post.shortReposterAddressEnd}</span> 
                    {` reposted at block ${post.repostState.repostBlockHeight} (User Repost:${post.repostState.userRepostsCounter})`}
                </div>}
                <div className="flex items-center border-4 p-2 shadow-lg text-xs text-white bg-black">
                  <span 
                    className="mr-2 cursor-pointer hover:underline"
                    onMouseEnter={() => setSelectedProfileAddress(post.postState.posterAddress)}
                    onClick={() => setProfileAddress(selectedProfileAddress)}
                    >
                      <p className="mr-8">{post.shortPosterAddressEnd}</p>
                    </span>
                    <p className="mr-4">{post.repostState === undefined ? 'User Post:' + post.postState.userPostsCounter
                      : 'Post:' + post.postState.allPostsCounter}
                    </p>
                    <div className="flex-grow"></div>
                    <p className="mr-1">{'Block:' + post.postState.postBlockHeight}</p>
                </div>
                <div className="flex items-center border-4 p-2 shadow-lg whitespace-pre-wrap break-all">
                    <p>{post.content}</p>
                </div>
                <div className="flex flex-row">
                  {post.top3Emojis.map((emoji: string) => emoji)}
                  <p className="text-xs ml-1 mt-2">{post.processedReactions.length > 0 ? post.processedReactions.length : null}</p>
                  {post.numberOfComments > 0 ? <button
                  className="hover:text-lg ml-3"
                  onClick={() => setCommentTarget(post)}
                  >
                    <FontAwesomeIcon icon={faComments} />
                  </button> : null}
                  <p className="text-xs ml-1 mt-2">{post.numberOfComments > 0 ? post.numberOfComments : null}</p>
                  {post.numberOfReposts > 0 ? <div className="ml-3"><FontAwesomeIcon icon={faRetweet} /></div> : null}
                  <p className="text-xs ml-1 mt-2">{post.numberOfReposts > 0 ? post.numberOfReposts : null}</p>
                  <div className="flex-grow"></div>
                  {walletConnected && <ReactionButton
                    targetKey={post.postKey}
                  />}
                  {walletConnected && <CommentButton
                    targetKey={post.postKey}
                  />}
                  {walletConnected && <RepostButton
                    targetKey={post.postKey}
                  />}
                </div>
            </div>
        );
      })}
      {!loading && whenZeroContent && <div className="p-2 border-b-2 shadow-lg">
        <div className="flex items-center border-4 p-2 shadow-lg whitespace-pre-wrap break-all">
            <p >The query threw zero results</p>
        </div>
      </div>}
    </div>
  );
};