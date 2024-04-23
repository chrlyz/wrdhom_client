import { useEffect, useState } from 'react';
import { getCID } from './utils/cid';

export default function CreatePost({
    account
}: {
    account: string[]
}) {
    const [post, setPost] = useState('');
    const [postCID, setPostCID] = useState('');
    const [signedData, setSignedData] = useState(null as any);

    const handleClick = async () => {
        const cid = await getCID(post);
        console.log(cid);
        setPostCID(cid);
    }

    useEffect(() => {
        (async () => {
            if (postCID !== '') {
                const { CircuitString } = await import('o1js');
                const s = await (window as any).mina
                    .signFields({ message: [CircuitString.fromString(postCID).hash().toString()] })
                    .catch(() => {
                        return {
                            publicKey: '',
                            data: '',
                            signature: {
                            field: '',
                            scalar: ''
                            }
                        }
                });
                setSignedData(s);
            }
        })();
    }, [postCID]);

    useEffect(() => {
        (async ()=> {
            if (signedData !== null) {
                const signedPost = {
                    post: post,
                    signedData: signedData
                }

                const res = await fetch('/posts', {
                    method: `POST`,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(signedPost),
                });
                const resJSON = await res.json();

                if (await resJSON.message === 'Post already exists') {
                    alert(resJSON.message);
                  }

                if (await resJSON.message === 'Restore?') {
                    const restore = confirm('Post already exists but was deleted. Do you want to restore it?');
                    if (restore) {
                        const { PostState, fieldToFlagPostsAsRestored } = await import('wrdhom');
                        const postKey = resJSON.postKey;
                        const response = await fetch(`/posts`+
                        `?postKey=${postKey.toString()}`,
                        {
                          headers: {'Cache-Control': 'no-cache'}
                        }
                      );
                      const data: any = await response.json();
                      const postStateJSON = JSON.parse(data.postState);
                      const postState = PostState.fromJSON(postStateJSON);
                      const s = await (window as any).mina
                                    .signFields({ message: [
                                        postState.hash().toString(),
                                        fieldToFlagPostsAsRestored.toString()
                                    ] });
                      const signedPostRestoration = {
                        postKey: postKey.toString(),
                        signedData: s
                      }

                      const restorationRes = await fetch('/posts/restore', {
                        method: `POST`,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(signedPostRestoration),
                      });

                      console.log(await restorationRes.text());
                    }
                }
                setPost('');
            }
        })();
    }, [signedData]);

    return (
        <div className="w-full p-2 border-b-2 shadow-lg">
            <textarea
                className="w-full h-28 p-2 border-2 border-gray-300"
                placeholder="Spread the wrd..."
                value={post}
                onChange={e => setPost(e.target.value)}
            >
            </textarea>
            <button
                className="w-full p-1 bg-black text-white"
                onClick={handleClick}
            >Wrd</button>
        </div>
    )
}