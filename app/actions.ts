'use server';
import { createDirectoryEncoderStream, CAREncoderStream } from 'ipfs-car';
import { Web3Storage, File } from 'web3.storage';

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

    const client = new Web3Storage({ token: process.env.WEB3STORAGE_TOKEN! });
    const storedPostCID = await client.put([file]);
    
    console.log(storedPostCID.toString());
}