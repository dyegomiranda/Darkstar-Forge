/** A fase do passo depende da distância; não muda ao variar o FPS ou a velocidade. */
export function frameForDistance(travel:number,frames:number,stride=32):number {
 return Math.floor(Math.max(0,travel)/stride*frames)%Math.max(1,frames);
}
