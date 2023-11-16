'use server';
import { createDirectoryEncoderStream, CAREncoderStream } from 'ipfs-car';
import { File } from '@web-std/file';

export async function createPost(formData: FormData) {
    const post = formData.get('post');
    
    let postCID: any;
    const file = new File([post!.toString()], 'wrdhom');
    await createDirectoryEncoderStream([file])
    .pipeThrough(
      new TransformStream({
        transform(block, controller) {
          postCID = block.cid;
          controller.enqueue(block);
        },
      })
    )
    .pipeThrough(new CAREncoderStream())
    .pipeTo(new WritableStream());

    console.log(postCID.toString());
}