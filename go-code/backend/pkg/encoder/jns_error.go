package encoder

import (
	"fmt"
	"net/http"

	"github.com/go-kratos/kratos/v2/errors"
	khttp "github.com/go-kratos/kratos/v2/transport/http"
)

type Errno struct {
	Result  string `json:"result"`
	Message string `json:"message"`
}

// JNSErrorEncoder encodes the error to the HTTP response(JNS format).
func JNSErrorEncoder(w http.ResponseWriter, r *http.Request, err error) {
	se := errors.FromError(err)
	codec, _ := khttp.CodecForRequest(r, "Accept")
	e := &Errno{
		Result:  "fail",
		Message: fmt.Sprintf("reason:%s, detail:%s", se.Reason, se.Message),
	}
	body, err := codec.Marshal(e)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", ContentType(codec.Name()))
	w.WriteHeader(int(se.Code))
	_, _ = w.Write(body)
}
