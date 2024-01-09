import { useState } from 'react';
import { getCID } from './utils/cid';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComment } from '@fortawesome/free-solid-svg-icons';

export default function CommentButton({
  posterAddress,
  postContentID
}: {
  posterAddress: string,
  postContentID: string
}) {
    const [comment, setComment] = useState('');
    const [showCommentBox, setShowCommentBox] = useState(false);
    const [expandCommentBox, setExpandCommentBox] = useState('');

    const createComment = async () => {
        const { Poseidon, PublicKey, CircuitString} = await import('o1js');
        const posterAddressAsField = Poseidon.hash(PublicKey.fromBase58(posterAddress).toFields());
        const postContentIDAsField = CircuitString.fromString(postContentID).hash();
        const targetKey = Poseidon.hash([posterAddressAsField, postContentIDAsField]);
        const commentCID = await getCID(comment);
        const s = await (window as any).mina
            .signFields({ message: [
                targetKey.toString(),
                CircuitString.fromString(commentCID).hash().toString()]})
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

        const signedComment = {
            posterAddress: posterAddress,
            postContentID: postContentID,
            comment: comment,
            signedData: s
            }

        const res = await fetch('/comments', {
            method: `POST`,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(signedComment),
        });
        console.log(await res.text());
        setComment('');
    };

    const handleCommentBoxView = () => {
        setShowCommentBox(!showCommentBox);
        if (expandCommentBox === '') {
            setExpandCommentBox('w-full');
        } else {
            setExpandCommentBox('');
        }
    }
  
    return (
        <div className={expandCommentBox}>
            <button
                onClick={() => handleCommentBoxView()}
                className="mr-1"
            >
                <FontAwesomeIcon icon={faComment} />
            </button>
            {showCommentBox && <div className="w-full">
                <textarea
                    className="w-full h-48 p-2 border-2 border-gray-300"
                    placeholder="Spread the wrd..."
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                >
                </textarea>
                <button
                    className="w-full p-2 bg-black text-white"
                    onClick={() => createComment()}
                >Wrd</button>
            </div>}
        </div>
    );
}