'use client';

import CreatePost from '@/app/create-post';
import { useState, useEffect } from 'react';
import InstallWallet from '@/app/install-wallet';
import ConnectWallet from './connect-wallet';
import GetPosts from './get-posts';
import QuerySettings from './query-settings';
import GetProfile from './get-profile';
import GetComments from './get-comments';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [hasWallet, setHasWallet] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [account, setAccount] = useState(['Not connected']);
  const [accountChanged, setAccountChanged] = useState(false);
  const [getPosts, setGetPosts] = useState(false);
  const [howManyPosts, setHowManyPosts] = useState(3);
  const [fromBlock, setFromBlock] = useState(27_182);
  const [toBlock, setToBlock] = useState(100_000);
  const [getProfile, setGetProfile] = useState(false);
  const [profilePosterAddress, setProfilePosterAddress] = useState('');
  const [profileHowManyPosts, profileSetHowManyPosts] = useState(1);
  const [profileFromBlock, profileSetFromBlock] = useState(27_182);
  const [profileToBlock, profileSetToBlock] = useState(100_000);
  const [hideGetPosts, setHideGetPosts] = useState('')
  const [showProfile, setShowProfile] = useState(false);
  const [howManyComments, setHowManyComments] = useState(3);
  const [commentsFromBlock, setCommentsFromBlock] = useState(27_182);
  const [commentsToBlock, setCommentsToBlock] = useState(100_000);
  const [getComments, setGetComments] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentTarget, setCommentTarget] = useState(null as any);

  const walletConnection = () => setWalletConnected(!walletConnected);
  

  useEffect(() => {
    (async () => {
      if (typeof (window as any).mina !== 'undefined') {
        setHasWallet(true);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (walletConnected) {
        const a = await (window as any).mina.requestAccounts()
          .catch(() => {
            setWalletConnected(false);
          });
        setAccount(a);
      }
    })();
  }, [walletConnected, accountChanged]);

  useEffect(() => {
    if (typeof (window as any).mina !== 'undefined') {
      (window as any).mina?.on('accountsChanged', () => {
        setAccountChanged(!accountChanged);
      });
    }
    
    return () => (window as any).mina?.off('accountsChanged');
  });

  useEffect(() => {
    if (profilePosterAddress !== '') {
      setHideGetPosts('hidden');
      setShowComments(false);
      setCommentTarget(null);
      setShowProfile(true);
    }
  }, [profilePosterAddress]);

  useEffect(() => {
    if (commentTarget !== null) {
      setHideGetPosts('hidden');
      setShowProfile(false);
      setProfilePosterAddress('');
      setShowComments(true);
    }
  }, [commentTarget]);

  return (
  <main>
    <div className="flex min-h-screen">
      <div className="flex flex-col w-1/5 border-r">
        <div className="p-4 flex-grow">
          <h1 className="text-2xl font-bold mb-3">WrdHom: The auditable social-media platform</h1>
          <br/>
          {loading ? null : !hasWallet && <InstallWallet />}
          <p className="text-s mb-2 break-words">{hasWallet ? 'Your account is: ' + account[0] : ''}</p>
          {loading ? null : hasWallet && !walletConnected && <ConnectWallet walletConnection={walletConnection}/>}
        </div>
        <div className="p-4 w-full mb-32">
          {loading ? null : walletConnected && <CreatePost />}
        </div>
      </div>
      <GetPosts getPosts={getPosts}
        howManyPosts={howManyPosts}
        fromBlock={fromBlock}
        toBlock={toBlock}
        setProfilePosterAddress={setProfilePosterAddress}
        hideGetPosts={hideGetPosts}
        walletConnected={walletConnected}
        setCommentTarget={setCommentTarget}
      />
      {showProfile && <GetProfile
        getProfile={getProfile}
        profilePosterAddress={profilePosterAddress}
        setProfilePosterAddress={setProfilePosterAddress}
        profileHowManyPosts={profileHowManyPosts}
        profileFromBlock={profileFromBlock}
        profileToBlock={profileToBlock}
        setShowProfile={setShowProfile}
        setHideGetPosts={setHideGetPosts}
        walletConnected={walletConnected}
        setCommentTarget={setCommentTarget}
      />}
      {showComments && <GetComments
        commentTarget={commentTarget}
        setProfilePosterAddress={setProfilePosterAddress}
        howManyComments={howManyComments}
        commentsFromBlock={commentsFromBlock}
        commentsToBlock={commentsToBlock}
        getComments={getComments}
        walletConnected={walletConnected}
        setCommentTarget={setCommentTarget}
        setHideGetPosts={setHideGetPosts}
        setShowComments={setShowComments}
      />}
      <div className="flex flex-col w-1/5 border-r">
        <div className="flex-grow">
          {walletConnected && <QuerySettings
            howManyPosts={howManyPosts}
            setHowManyPosts={setHowManyPosts}
            fromBlock={fromBlock}
            setFromBlock={setFromBlock}
            toBlock={toBlock}
            setToBlock={setToBlock}
            profileHowManyPosts={profileHowManyPosts}
            profileSetHowManyPosts={profileSetHowManyPosts}
            profileFromBlock={profileFromBlock}
            profileSetFromBlock={profileSetFromBlock}
            profileToBlock={profileToBlock}
            profileSetToBlock={profileSetToBlock}
            howManyComments={howManyComments}
            setHowManyComments={setHowManyComments}
            commentsFromBlock={commentsFromBlock}
            setCommentsFromBlock={setCommentsFromBlock}
            commentsToBlock={commentsToBlock}
            setCommentsToBlock={setCommentsToBlock}
          />}
        </div>
        {walletConnected && !showProfile && !showComments && (
            <div className="p-4 w-full mb-32">
              <button 
                className="w-full p-2 bg-black text-white"
                onClick={() => setGetPosts(!getPosts)}>
                Update Feed
              </button>
            </div>
          )}
        {walletConnected && showProfile && (
          <div className="p-4 w-full mb-32">
            <button 
              className="w-full p-2 bg-black text-white"
              onClick={() => setGetProfile(!getProfile)}>
              Update Profile
            </button>
          </div>
        )}
        {walletConnected && showComments && (
          <div className="p-4 w-full mb-32">
            <button 
              className="w-full p-2 bg-black text-white"
              onClick={() => setGetComments(!getComments)}>
              Update Comments
            </button>
          </div>
        )}
      </div>
    </div>
  </main>
  );
}
