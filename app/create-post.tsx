import { createPost } from '@/app/actions';
import { useEffect, useState } from 'react';
import { SignedData } from '@aurowallet/mina-provider';
import { createFileEncoderStream, CAREncoderStream } from 'ipfs-car';
import { Blob } from '@web-std/file';

export default function CreatePost() {
    const [buttonClicked, setButtonClicked] = useState(false);

    const [post, setPost] = useState('');
    const handleClicks = () => {
        setButtonClicked(!buttonClicked);
        console.log(post);
    }
    const [postCID, setPostCID] = useState(null as any);
    const emptySignedData: SignedData = {
        publicKey: '',
        data: 'aaa',
        signature: {
          field: '',
          scalar: ''
        }
      }
    let signedData = emptySignedData;
    const [s, setS] = useState(emptySignedData);
    let createPostWithSignedData = createPost.bind(null, s);
    const handleSignButton = async () => {
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
        
        setButtonClicked(true);
    }

    useEffect(() =>  {
        (async () => {
            console.log('1');
            if (buttonClicked) {
                console.log('2');
                signedData = await (window as any).mina.signMessage({ message: postCID.toString() }).catch(() => {
                    return emptySignedData;
                });
                setS(signedData);
                console.log(signedData);
                console.log('3');
                //post.toString().split("").map((char) => console.log(char.charCodeAt(0)));
            }
            
        })();
    }, [buttonClicked])

    return (
    <div>
        <form action={createPostWithSignedData}>
            <div>
                <textarea name="post" placeholder="Spread the wrd..." onChange={e => setPost(e.target.value)}>
                </textarea>
                {buttonClicked ? <button>Wrd</button> : null}
            </div>
        </form>
        {!buttonClicked ? <button onClick={handleSignButton}>Sign Post</button> : null}
    </div>
    )
}