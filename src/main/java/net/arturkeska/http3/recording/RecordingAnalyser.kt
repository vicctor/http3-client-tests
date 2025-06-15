package net.arturkeska.http3.recording

fun main(args: Array<String>) {
    val reader = RecordReader()

    val records = reader.read()

    records
        .filter { it.success }
        //.filter { it.environment.provider.contains("bussinesslink")}
        //.filter { it.environment.provider.contains("microtic")}
        //.filter { it.environment.provider.contains("orange")}A
        //.filter { it.environment.provider.contains("poznan")}
        .groupBy { "[ responseSize=${it.responseSize/1024}KiB  parallel=${it.parallel} repeat=${it.repeat}]" }
        .forEach { sized ->
            println(sized.key)
            sized.value
                .groupBy { it.protocol }
                .map { it.key to it.value.map { it.duration }.average() }
                .forEach { println("| %-17s | %d".format(it.first, (it.second / 100_000.0).toInt())) }
        }

}
