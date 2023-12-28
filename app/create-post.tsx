import { useEffect, useState } from 'react';
import { getCID } from './utils/cid';

export default function CreatePost() {
    const [post, setPost] = useState('');
    const [postCID, setPostCID] = useState('');
    const [signedData, setSignedData] = useState(null as any);
    setPostCID
    const handleClick = async () => {
        const cid = await getCID(post);
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
                setPost('');
                console.log(res);
            }
        })();
    }, [signedData]);

    return (
        <div className="w-full">
            <textarea
                className="w-full h-48 p-2 border-2 border-gray-300 mb-2"
                placeholder="Spread the wrd..."
                value={post}
                onChange={e => setPost(e.target.value)}
            >
            </textarea>
            <button
                className="w-full p-2 bg-black text-white"
                onClick={handleClick}
            >Wrd</button>
        </div>
    )
}