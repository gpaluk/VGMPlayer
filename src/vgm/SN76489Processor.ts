import { Player } from "./Player"

export class SN76489Processor extends AudioWorkletProcessor
{
  private readonly BUFFER_SIZE = 128

  private _player: Player = new Player()
  private _buffer = new Float32Array(this.BUFFER_SIZE)

  constructor()
  {
    super()

    this.port.onmessage = (file: MessageEvent) =>
    {
      console.log("Loading file...")
      this._player.load(file.data)

      console.log('Game name: ', this._player.gameName)
      console.log('Author: ', this._player.originalAuthor)
      console.log('Release date: ', this._player.releaseDate)
      console.log('Track name: ', this._player.trackName)
      console.log('Converted by: ', this._player.whoConverted)

      this._player.looping = true
      this._player.play()
    }
  }

  process(_: Float32Array[][], outputs: Float32Array[][])
  {
    this._player.render(this._buffer, this.BUFFER_SIZE)
    outputs[0][0].set(this._buffer, 0)

    return true
  }
}

registerProcessor("sn76489-processor", SN76489Processor)