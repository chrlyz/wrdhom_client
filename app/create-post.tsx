import { createPost } from '@/app/actions';

export default function CreatePost() {
    return (
    <form action={createPost}>
        <div>
            <textarea name="post" placeholder="Spread the wrd...">
            </textarea>
            <button>
                Wrd
            </button>
        </div>
    </form>
    )
}