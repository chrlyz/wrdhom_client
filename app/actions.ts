'use server';
import { createDirectoryEncoderStream, CAREncoderStream, Block } from 'ipfs-car';
import * as Signer from '@ucanto/principal/ed25519';
import { CarReader } from '@ipld/car';
import { importDAG } from '@ucanto/core/delegation';
import * as Client from '@web3-storage/w3up-client';

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

  // Load client with specific private key
  const principal = Signer.parse(process.env.KEY!);
  const client = await Client.create({ principal });
  // Add proof that this agent has been delegated capabilities on the space
  const proof = await parseProof(process.env.PROOF!);
  const space = await client.addSpace(proof);
  await client.setCurrentSpace(space.did());

  const storedPostCID = client.uploadDirectory([file]);
  
  console.log(storedPostCID.toString());
}

async function parseProof (data: string) {
  const blocks = []
  const reader = await CarReader.fromBytes(Buffer.from(data, 'base64'))
  for await (const block of reader.blocks()) {
    blocks.push(block)
  }
  return importDAG(blocks as Iterable<Block<unknown, number, number, 1>>)
}