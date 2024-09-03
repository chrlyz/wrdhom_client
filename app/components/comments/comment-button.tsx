import { useState } from 'react';
import { getCID } from '../utils/cid';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComment } from '@fortawesome/free-solid-svg-icons';
import { CommentState } from 'wrdhom';

export default function CommentButton({
    targetKey
}: {
    targetKey: string
}) {
    const [comment, setComment] = useState('');
    const [showCommentBox, setShowCommentBox] = useState(false);
    const [expandCommentBox, setExpandCommentBox] = useState('');

    const createComment = async () => {
        const { CircuitString } = await import('o1js');
        const commentCID = await getCID(comment);
        const s = await (window as any).mina
            .signFields({ message: [
                targetKey,
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
            comment: comment,
            signedData: s
        }

        const res = await fetch('/comments', {
            method: `POST`,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(signedComment),
        });
        const resJSON = await res.json();

        if (await resJSON.message === 'Comment already exists') {
            alert(resJSON.message);
          }

        if (await resJSON.message === 'Restore?') {
            const restore = confirm('Comment already exists but was deleted. Do you want to restore it?');
            if (restore) {
                const { CommentState, fieldToFlagCommentsAsRestored } = await import('wrdhom');
                const commentKey = resJSON.commentKey;
                const response = await fetch(`/comments`+
                `?commentKey=${commentKey.toString()}`,
                {
                  headers: {'Cache-Control': 'no-cache'}
                }
              );
              const data: any = await response.json();
              const commentStateJSON = JSON.parse(data.commentState);
              const commentState = CommentState.fromJSON(commentStateJSON) as CommentState;
              const s = await (window as any).mina
                            .signFields({ message: [
                                commentState.hash().toString(),
                                fieldToFlagCommentsAsRestored.toString()
                            ] });
              const signedCommentRestoration = {
                targetKey: targetKey,
                commentKey: commentKey.toString(),
                signedData: s
              }

              const restorationRes = await fetch('/comments/restore', {
                method: `PATCH`,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(signedCommentRestoration),
              });

              console.log(await restorationRes.text());
            }
        }

        setComment('');
        setShowCommentBox(false);
        if (expandCommentBox === '') {
            setExpandCommentBox('w-full');
        } else {
            setExpandCommentBox('');
        }
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
        <div className={`${expandCommentBox}`}>
            <button
                className="hover:text-lg ml-3"
                onClick={() => handleCommentBoxView()}
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