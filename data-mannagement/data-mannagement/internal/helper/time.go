package helper

import (
	"strconv"
	"time"
)

func NanoTimestampStr() string {
	ts := time.Now().UnixNano()
	return strconv.FormatInt(ts, 10)
}
