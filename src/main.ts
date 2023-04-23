import SN76489Processor from "./vgm/SN76489Processor.ts?url"

let ctx

const main = async() => 
{
    let playButton = document.getElementById('play-button') as HTMLButtonElement
    playButton.onclick = () => startAudioWorklet()
}

const createWorkletNode = async (
    context: BaseAudioContext,
    name: string,
    url: string) => 
{
    try
    {
        return new AudioWorkletNode(context, name)
    } 
    catch (err)
    {
        await context.audioWorklet.addModule(url)
        return new AudioWorkletNode(context, name)
    }
}

const startAudioWorklet = async () =>
{
    console.log('Starting the audio now...')

    ctx = new AudioContext({
        'sampleRate': 44100,
        'latencyHint': 'playback'
    })

    const source = ctx.createBufferSource()
    const workletNode = await createWorkletNode(ctx, "sn76489-processor", SN76489Processor)

    // connect everything and automatically start playing
    source.connect(workletNode).connect(ctx.destination)
    source.start(0)

    const file = await fetch('example.vgm')
    const fileBuffer = await file.arrayBuffer()
    const fileData = new Uint8Array(fileBuffer)

    workletNode.port.postMessage(fileData)
}

main()