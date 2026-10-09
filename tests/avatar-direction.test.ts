import { expect, it } from "vitest";
import { directionRow, EIGHT_DIRECTIONS, facing } from "../src/avatar/direction";
it("resolve oito setores e conserva a direção sem movimento", () => {
  const vectors = [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
  expect(vectors.map(([x,y]) => facing(x,y))).toEqual(EIGHT_DIRECTIONS);
  expect(facing(0,0,"nw")).toBe("nw");
});
it("lê atlas de oito vistas sem confundir a ordem LPC atual", () => {
  EIGHT_DIRECTIONS.forEach((dir, i) => expect(directionRow(dir, EIGHT_DIRECTIONS)).toBe(i));
  expect(directionRow("s")).toBe(2);
  expect(directionRow("ne")).toBe(3);
  expect(directionRow("sw")).toBe(1);
});
