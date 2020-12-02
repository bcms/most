import { BCMSMost } from './main';

const bcmsMost = BCMSMost();

export async function createPages({ actions }) {
  const { createPage } = actions;
  await bcmsMost.parser.gatsby(createPage);
}
