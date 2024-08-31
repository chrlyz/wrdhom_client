import { useState, useEffect } from 'react';
import { Dispatch, SetStateAction } from "react";
import { getCID } from '../../../utils/cid';
import ItemContentList from './../content-item';
import CreatePost from '../../posts/create-post';
import { ContentType, EmbeddedReactions } from '../../../types';
