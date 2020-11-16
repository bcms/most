import * as fs from 'fs';
import * as util from 'util';
import * as path from 'path';
import type { Express } from 'express';
import { BCMSMost } from './main';

const bcmsMost = BCMSMost();

export async function createPages({ actions }) {
  const { createPage } = actions;
  await bcmsMost.parser.gatsby(createPage);
}
