package net.arturkeska.http3.recording

object RecordingAnalyser {
    @JvmStatic
    fun main(args: Array<String>) {
        val reader = RecordReader()

        val records = reader.read()

        records
            .filter { it.success }
            .filter { !it.environment.provider.contains("bussinesslink")}
            .groupBy { "[ responseSize=${it.responseSize/1024}KiB  parallel=${it.parallel} ]" }
            .forEach { sized ->
                println(sized.key)
                sized.value
                    .groupBy { it.protocol }
                    .map { it.key to it.value.map { it.duration }.average() }
                    .forEach { println("| %-17s | %d".format(it.first, (it.second / 100_000.0).toInt())) }
            }

    }
}
