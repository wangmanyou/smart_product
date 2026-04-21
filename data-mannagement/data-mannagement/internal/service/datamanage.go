package service

import (
	"context"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/biz"

	pb "gitee.com/kangdan0404/backend-of-knowledge-base/api/datamanage/v1"
)

type DataManageService struct {
	pb.UnimplementedDataManageServer
	uc *biz.DataManageUC
}

func NewDataManageService(uc *biz.DataManageUC) *DataManageService {
	return &DataManageService{uc: uc}
}

func (s *DataManageService) SayHello(ctx context.Context, req *pb.HelloRequest) (*pb.HelloReply, error) {
	g, err := s.uc.CreateGreeter(ctx, &biz.Greeter{Hello: req.Name})
	if err != nil {
		return nil, err
	}
	return &pb.HelloReply{Message: "Hello " + g.Hello}, nil
}
