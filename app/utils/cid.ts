import { createFileEncoderStream, CAREncoderStream } from 'ipfs-car';
import { Blob } from '@web-std/file';

export async function getCID(file: string) {
    const blob = new Blob([file]);
    let postCID: any;
    await createFileEncoderStream(blob)
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
  
    return postCID.toString();
  }