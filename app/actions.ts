'use server';
import { createFileEncoderStream, CAREncoderStream } from 'ipfs-car';
import { Blob } from '@web-std/file';
import { SignedData } from '@aurowallet/mina-provider';

export async function createPost(signedData: SignedData, formData: FormData) {
    const post = formData.get('post')!.toString().replace("\r", "");
    
    let postCID: any;
    const file = new Blob([post!]);
    await createFileEncoderStream(file)
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

    signedData.data === postCID.toString() ? console.log('YES!!!') : console.log('NO!!!');
    console.log(signedData.data);

    //post!.toString().split("").map((char) => console.log(char.charCodeAt(0)))
    console.log(postCID.toString());
}