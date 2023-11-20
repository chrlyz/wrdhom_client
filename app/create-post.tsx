import { useEffect, useState } from 'react';
import { createFileEncoderStream, CAREncoderStream } from 'ipfs-car';
import { Blob } from '@web-std/file';

export default function CreatePost() {
    const [post, setPost] = useState('');
    const [postCID, setPostCID] = useState(null as any);
    const [signedData, setSignedData] = useState(null as any);

    const handleClick = async () => {
        const file = new Blob([post]);

        await createFileEncoderStream(file)
        .pipeThrough(
        new TransformStream({
            transform(block, controller) {
            setPostCID(block.cid);
            controller.enqueue(block);
            },
        })
        )
        .pipeThrough(new CAREncoderStream())
        .pipeTo(new WritableStream());
    }

    useEffect(() => {
        (async () => {
            if (postCID !== null ) {
                const s = await (window as any).mina
                    .signMessage({ message: postCID.toString() })
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
        })()
    }, [postCID]);

    useEffect(() => {
        (async ()=> {
            if (signedData !== null) {
                const res = await fetch('/posts', {
                    method: `POST`,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(signedData),
                });
            }
        })();
    }, [signedData]);

    return (
        <div>
            <div>
                <textarea name="post"
                    placeholder="Spread the wrd..."
                    onChange={e => setPost(e.target.value)}
                >
                </textarea>
                <button onClick={handleClick}>Wrd</button>
            </div>
        </div>
    )
}